import AVFoundation
import UIKit
import BackroomsCore

/// Speaks for the game. With VoiceOver on, it hands the words to VoiceOver
/// (an announcement), so the player hears them in their own voice and speed.
/// Otherwise, and if the narrator setting is on, it uses the system voice.
@MainActor
final class Narrator {
    private let synth = AVSpeechSynthesizer()

    func say(_ text: String, lang: Lang, useVoice: Bool) {
        if UIAccessibility.isVoiceOverRunning && !useVoice {
            let s = NSAttributedString(string: text, attributes: [.accessibilitySpeechQueueAnnouncement: false])
            UIAccessibility.post(notification: .announcement, argument: s)
            return
        }
        guard useVoice else { return }
        synth.stopSpeaking(at: .immediate)
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: lang == .pt ? "pt-BR" : "en-US")
        u.rate = AVSpeechUtteranceDefaultSpeechRate
        synth.speak(u)
    }

    func stop() { synth.stopSpeaking(at: .immediate) }
}
