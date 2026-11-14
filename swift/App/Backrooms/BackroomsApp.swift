import SwiftUI

@main
struct BackroomsApp: App {
    @StateObject private var model = AppModel()
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch model.screen {
            case .menu: MenuView()
            case .game: GameView()
            case .settings: SettingsView()
            case .howTo: HowToView()
            }
        }
        .onAppear { model.appeared() }
    }
}
