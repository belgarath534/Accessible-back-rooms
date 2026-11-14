import Foundation
import Capacitor
import GameKit

// Game Center for the game: sign in, unlock achievements, submit scores,
// and open Apple's Game Center screen. Every call resolves even when the
// player is not signed in, so the game never waits on Game Center.
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise)
    ]
    private var signInCalls: [CAPPluginCall] = []
    private var handlerSet = false

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if GKLocalPlayer.local.isAuthenticated {
                call.resolve(["signedIn": true])
                return
            }
            self.signInCalls.append(call)
            if self.handlerSet { return }
            self.handlerSet = true
            // Apple calls this again whenever the sign-in state changes.
            GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
                guard let self = self else { return }
                if let vc = viewController {
                    self.bridge?.viewController?.present(vc, animated: true)
                    return
                }
                let ok = GKLocalPlayer.local.isAuthenticated
                var result: [String: Any] = ["signedIn": ok]
                if let error = error { result["error"] = error.localizedDescription }
                let waiting = self.signInCalls
                self.signInCalls.removeAll()
                waiting.forEach { $0.resolve(result) }
                self.notifyListeners("signInChange", data: result)
            }
        }
    }

    @objc func unlock(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["reported": false])
            return
        }
        let achievement = GKAchievement(identifier: id)
        achievement.percentComplete = 100
        achievement.showsCompletionBanner = call.getBool("banner") ?? true
        GKAchievement.report([achievement]) { error in
            call.resolve(["reported": error == nil, "error": error?.localizedDescription ?? ""])
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let score = call.getInt("score"), GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["reported": false])
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
            call.resolve(["reported": error == nil, "error": error?.localizedDescription ?? ""])
        }
    }

    // what: "achievements", "leaderboards" or anything else for the main Game Center screen
    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.resolve(["shown": false])
                return
            }
            let what = call.getString("what") ?? ""
            let state: GKGameCenterViewControllerState = what == "achievements" ? .achievements : what == "leaderboards" ? .leaderboards : .default
            let vc = GKGameCenterViewController(state: state)
            vc.gameCenterDelegate = self
            self.bridge?.viewController?.present(vc, animated: true)
            call.resolve(["shown": true])
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
