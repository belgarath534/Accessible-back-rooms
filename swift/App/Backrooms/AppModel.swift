import SwiftUI
import UIKit
import BackroomsCore

/// The app's state: which screen is showing, the game being played, the
/// settings, and the bridge from the game's words and sounds to the narrator
/// and the audio engine.
@MainActor
final class AppModel: ObservableObject {
    enum Screen { case menu, game, settings, howTo }

    @Published var screen: Screen = .menu
    @Published var lastText = ""
    @Published var game: Game
    @Published var lang: Lang { didSet { save(); game.words = Words(lang: lang) } }
    @Published var difficulty: String { didSet { save() } }
    /// The game's own voice. Off by default when VoiceOver is on, which reads everything instead.
    @Published var narrator: Bool { didSet { save() } }

    let audio = AudioEngine()
    let speech = Narrator()
    private let defaults = UserDefaults.standard

    init() {
        let pt = Locale.preferredLanguages.first?.hasPrefix("pt") ?? false
        let l = Lang(rawValue: defaults.string(forKey: "lang") ?? "") ?? (pt ? .pt : .en)
        lang = l
        difficulty = defaults.string(forKey: "difficulty") ?? "normal"
        narrator = defaults.object(forKey: "narrator") as? Bool ?? !UIAccessibility.isVoiceOverRunning
        game = Game(lang: l, difficulty: defaults.string(forKey: "difficulty") ?? "normal")
    }

    private func save() {
        defaults.set(lang.rawValue, forKey: "lang")
        defaults.set(difficulty, forKey: "difficulty")
        defaults.set(narrator, forKey: "narrator")
    }

    /// A command's name as the game says it ("flashlight", "lanterna").
    func cmd(_ k: String) -> String { (GameData.shared.commandNames[lang.rawValue]?[k] ?? k).capitalizedFirst }

    func t(_ s: String, _ v: [String: CustomStringConvertible] = [:]) -> String { Words(lang: lang).t(s, v) }

    func appeared() {
        audio.start()
        audio.music(named: "menu", volume: 0.5)
    }

    // MARK: speaking

    func say(_ text: String) {
        let s = text.trimmingCharacters(in: .whitespaces)
        guard !s.isEmpty else { return }
        lastText = s
        speech.say(s, lang: lang, useVoice: narrator)
    }

    // MARK: game

    func newGame(mode: Mode = .story, level: Int = 0) {
        game = Game(lang: lang, difficulty: difficulty)
        let intro = game.start(mode: mode, level: level)
        screen = .game
        audio.music(named: game.level.music, volume: 0.25)
        say(intro)
        flushSounds()
    }

    func act(_ f: (Game) -> String) {
        let text = f(game)
        flushSounds()
        objectWillChange.send()
        say(text)
    }

    func continueNext() {
        guard let text = game.continueToNext() else { finishRun(); return }
        audio.music(named: game.level.music, volume: 0.25)
        flushSounds()
        objectWillChange.send()
        say(text)
    }

    func retry() {
        let text = game.retry()
        audio.music(named: game.level.music, volume: 0.25)
        flushSounds()
        objectWillChange.send()
        say(text)
    }

    func finishRun() {
        goToMenu()
    }

    func goToMenu() {
        screen = .menu
        audio.music(named: "menu", volume: 0.5)
        say(t("Main menu."))
    }

    private func flushSounds() {
        for s in game.takeSounds() { audio.play(s) }
    }
}
