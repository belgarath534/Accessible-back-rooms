import SwiftUI
import BackroomsCore

/// A big, easy-to-find button, in the game's colors.
struct BigButton: View {
    let title: String
    var primary = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.title3.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 54)
                .foregroundStyle(primary ? Color.black : Color(red: 0.96, green: 0.92, blue: 0.75))
                .background(primary ? Color(red: 0.93, green: 0.82, blue: 0.35) : Color(white: 0.14))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

struct MenuView: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Text("Accessible Backrooms")
                    .font(.largeTitle.bold())
                    .foregroundStyle(Color(red: 0.93, green: 0.82, blue: 0.35))
                    .accessibilityAddTraits(.isHeader)
                    .padding(.top, 30)
                Text(model.t("Swift preview. Version 1.6 is being rebuilt; not everything is here yet."))
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                BigButton(title: model.t("Play"), primary: true) { model.newGame() }
                BigButton(title: model.t("Extra levels")) { model.newGame(mode: .extra, level: GameData.shared.firstExtra) }
                BigButton(title: model.t("Settings")) { model.screen = .settings }
                BigButton(title: model.t("How to play")) { model.screen = .howTo }
            }
            .padding(20)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
    }
}

struct GameView: View {
    @EnvironmentObject var model: AppModel
    private let cols = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        let g = model.game
        ScrollView {
            VStack(spacing: 12) {
                Text("\(g.level.name(model.lang)) · \(model.t("Sanity")) \(Int(g.sanity.rounded()))%")
                    .font(.headline)
                    .foregroundStyle(Color(red: 0.93, green: 0.82, blue: 0.35))
                    .accessibilityAddTraits(.isHeader)
                Text(model.lastText)
                    .font(.body)
                    .foregroundStyle(Color(red: 0.96, green: 0.94, blue: 0.88))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(white: 0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .accessibilityHidden(true)    // already announced as it happens
                switch g.state {
                case .transition:
                    BigButton(title: model.t("Continue"), primary: true) { model.continueNext() }
                case .dead:
                    BigButton(title: model.t("Try again"), primary: true) { model.retry() }
                    BigButton(title: model.t("Main menu")) { model.goToMenu() }
                case .won:
                    BigButton(title: model.t("Main menu"), primary: true) { model.goToMenu() }
                default:
                    BigButton(title: model.t("Forward"), primary: true) { model.act { $0.move(0) } }
                        .keyboardShortcut(.upArrow, modifiers: [])
                    LazyVGrid(columns: cols, spacing: 12) {
                        BigButton(title: model.t("Go left")) { model.act { $0.move(3) } }.keyboardShortcut(.leftArrow, modifiers: [])
                        BigButton(title: model.t("Go right")) { model.act { $0.move(1) } }.keyboardShortcut(.rightArrow, modifiers: [])
                        BigButton(title: model.t("Turn left")) { model.act { $0.turn(3) } }.keyboardShortcut(.leftArrow, modifiers: .shift)
                        BigButton(title: model.t("Turn right")) { model.act { $0.turn(1) } }.keyboardShortcut(.rightArrow, modifiers: .shift)
                        BigButton(title: model.t("Go back")) { model.act { $0.move(2) } }.keyboardShortcut(.downArrow, modifiers: [])
                        BigButton(title: model.t("Turn around")) { model.act { $0.turn(2) } }
                    }
                    BigButton(title: model.t("Listen"), primary: true) { model.act { $0.listen() } }.keyboardShortcut("l", modifiers: [])
                    LazyVGrid(columns: cols, spacing: 12) {
                        BigButton(title: model.t("Look around")) { model.act { $0.look() } }.keyboardShortcut("k", modifiers: [])
                        BigButton(title: model.t("Drink almond water")) { model.act { $0.drink() } }.keyboardShortcut("d", modifiers: [])
                        BigButton(title: model.t("Status")) { model.act { $0.status() } }.keyboardShortcut("s", modifiers: [])
                        BigButton(title: model.t("Repeat")) { model.say(model.lastText) }.keyboardShortcut("r", modifiers: [])
                    }
                    BigButton(title: model.t("Main menu")) { model.goToMenu() }
                }
            }
            .padding(16)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        Form {
            Picker(model.t("Language"), selection: $model.lang) {
                Text("English").tag(Lang.en)
                Text("Português").tag(Lang.pt)
            }
            Picker(model.t("Difficulty"), selection: $model.difficulty) {
                Text(model.t("Easy")).tag("easy")
                Text(model.t("Normal")).tag("normal")
                Text(model.t("Nightmare")).tag("nightmare")
            }
            Toggle(model.t("Narrator voice"), isOn: $model.narrator)
            Button(model.t("Back to the main menu")) { model.screen = .menu }
        }
        .scrollContentBackground(.hidden)
    }
}

struct HowToView: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(model.t("How to play")).font(.title.bold()).accessibilityAddTraits(.isHeader)
                Text(model.t("Find the exit of each level by sound. Say or press listen to hear which way the exit is, and how far. Use headphones: sounds come from where they really are, in front, behind or beside you. Monsters roam the halls. If one catches you, you lose sanity. Drink almond water to get it back."))
                BigButton(title: model.t("Back to the main menu"), primary: true) { model.screen = .menu }
            }
            .padding(20)
        }
    }
}
