import AVFoundation
import BackroomsCore

/// 3D sound. Every sound goes through Apple's HRTF spatializer, so with
/// headphones it comes from in front, behind or beside you, like the web
/// version's panner. The game's recordings are loaded from the audio folder;
/// the simple sounds (footsteps, bumps, chimes, beacons) are made in code.
@MainActor
final class AudioEngine {
    private let engine = AVAudioEngine()
    private let env = AVAudioEnvironmentNode()
    private var players: [AVAudioPlayerNode] = []
    private var next = 0
    private var buffers: [String: AVAudioPCMBuffer] = [:]
    private var musicPlayer: AVAudioPlayer?
    private var musicName = ""
    private let rate = 44100.0
    private lazy var mono = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1)!
    private var started = false

    func start() {
        guard !started else { return }
        started = true
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)
        engine.attach(env)
        engine.connect(env, to: engine.mainMixerNode, format: nil)
        env.listenerPosition = AVAudio3DPoint(x: 0, y: 0, z: 0)
        env.distanceAttenuationParameters.rolloffFactor = 0.0001   // the game sets loudness itself
        env.outputType = .headphones
        for _ in 0..<20 {
            let p = AVAudioPlayerNode()
            engine.attach(p)
            engine.connect(p, to: env, format: mono)
            p.renderingAlgorithm = .HRTFHQ
            players.append(p)
        }
        makeSynthSounds()
        do { try engine.start() } catch { print("Audio engine:", error) }
    }

    // MARK: music

    func music(named name: String, volume: Float) {
        guard name != musicName || musicPlayer?.isPlaying != true else { musicPlayer?.setVolume(volume, fadeDuration: 1); return }
        musicPlayer?.stop()
        musicName = name
        guard let url = Bundle.main.url(forResource: name, withExtension: "mp3", subdirectory: "audio"),
              let p = try? AVAudioPlayer(contentsOf: url) else { musicPlayer = nil; return }
        p.numberOfLoops = -1
        p.volume = 0
        p.play()
        p.setVolume(volume, fadeDuration: 1.5)
        musicPlayer = p
    }

    // MARK: playing

    func play(_ e: SoundEvent) {
        switch e {
        case .footstep(let surface): play(buf("step_" + (["carpet", "tile", "metal", "water", "snow", "grass"].contains(surface) ? surface : "carpet")), at: SoundPos(0, -0.3, -0.2), volume: 0.8)
        case .bump: play(buf("bump"), at: .center, volume: 1)
        case .turn(let side): play(buf("turn"), at: SoundPos(Double(side) * 0.6, 0, -0.5), volume: 0.4)
        case .pickup: play(buf("pickup"), at: .center, volume: 0.6)
        case .drink: play(buf("drink"), at: .center, volume: 0.7)
        case .beacon(_, let at, let v, let m): play(buf("beacon"), at: at, volume: v, muffle: m)
        case .monster(let type, let at, let v, let m): play(monsterBuffer(type), at: at, volume: v, muffle: m)
        case .monsterStep(_, let at, let v, let m): play(buf("monstep"), at: at, volume: v, muffle: m)
        case .heart(let fast): play(sample(fast ? "heartfast" : "heartslow") ?? buf("heart"), at: SoundPos(0, -0.2, 0.1), volume: 0.6)
        case .caught(let type): play(sample(["attack", "attack2", "scream"].randomElement()!), at: .center, volume: 1); _ = type
        case .levelDone: play(buf("noclip"), at: .center, volume: 0.8)
        case .gameOver: play(sample("bigscream"), at: .center, volume: 1)
        }
    }

    private func monsterBuffer(_ type: String) -> AVAudioPCMBuffer? {
        if let names = GameData.shared.monsters[type]?.sfx, let n = names.randomElement(), let s = sample(n) { return s }
        return buf("growl")
    }

    private func play(_ buffer: AVAudioPCMBuffer?, at p: SoundPos, volume: Double, muffle: Double = 0) {
        guard started, let buffer else { return }
        if !engine.isRunning { try? engine.start() }
        let player = players[next]
        next = (next + 1) % players.count
        player.stop()
        player.position = AVAudio3DPoint(x: Float(p.x) * 2, y: Float(p.y) * 2, z: Float(p.z) * 2)
        player.volume = Float(max(0, min(1, volume)))
        player.obstruction = Float(-40 * max(0, min(1, muffle)))   // muffled = farther, through walls
        player.scheduleBuffer(buffer, at: nil, options: .interrupts)
        player.play()
    }

    private func buf(_ name: String) -> AVAudioPCMBuffer? { buffers[name] }

    /// A recording from the audio folder, turned into a mono buffer the 3D mixer can place.
    private func sample(_ name: String) -> AVAudioPCMBuffer? {
        if let b = buffers["file:" + name] { return b }
        guard let url = Bundle.main.url(forResource: name, withExtension: "mp3", subdirectory: "audio"),
              let file = try? AVAudioFile(forReading: url),
              let src = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)),
              (try? file.read(into: src)) != nil,
              let conv = AVAudioConverter(from: file.processingFormat, to: mono) else { return nil }
        let cap = AVAudioFrameCount(Double(src.frameLength) * rate / file.processingFormat.sampleRate) + 1024
        guard let out = AVAudioPCMBuffer(pcmFormat: mono, frameCapacity: cap) else { return nil }
        var done = false
        _ = conv.convert(to: out, error: nil) { _, status in
            if done { status.pointee = .endOfStream; return nil }
            done = true; status.pointee = .haveData; return src
        }
        buffers["file:" + name] = out
        return out
    }

    // MARK: sounds made in code

    private func makeSynthSounds() {
        buffers["step_carpet"] = synth(0.5) { t, n in Self.thud(t, 0) * 0.5 + Self.burst(t, 0, 0.1) * n * 0.35 + Self.thud(t, 0.27) * 0.5 + Self.burst(t, 0.27, 0.1) * n * 0.35 }
        buffers["step_tile"] = synth(0.5) { t, n in Self.burst(t, 0, 0.06) * n * 0.6 + Self.burst(t, 0.27, 0.06) * n * 0.6 + Self.thud(t, 0) * 0.4 + Self.thud(t, 0.27) * 0.4 }
        buffers["step_metal"] = synth(0.6) { t, n in (Self.burst(t, 0, 0.08) + Self.burst(t, 0.27, 0.08)) * (n * 0.4 + sin(2 * .pi * 880 * t) * 0.15) }
        buffers["step_water"] = synth(0.8) { t, n in (Self.burst(t, 0, 0.3) + Self.burst(t, 0.3, 0.3)) * n * 0.45 }
        buffers["step_snow"] = synth(0.7) { t, n in (Self.burst(t, 0, 0.2) + Self.burst(t, 0.32, 0.2)) * n * 0.45 }
        buffers["step_grass"] = synth(0.7) { t, n in (Self.burst(t, 0, 0.18) + Self.burst(t, 0.3, 0.18)) * n * 0.35 }
        buffers["bump"] = synth(0.4) { t, n in sin(2 * .pi * (90 - 150 * t) * t) * exp(-t * 10) + n * Self.burst(t, 0, 0.08) * 0.4 }
        buffers["turn"] = synth(0.3) { t, n in n * sin(.pi * t / 0.3) * 0.5 }
        buffers["pickup"] = synth(0.8) { t, _ in [660.0, 880, 1320].enumerated().reduce(0.0) { a, e in a + Self.tone(t, Double(e.offset) * 0.1, e.element, 0.45) * 0.3 } }
        buffers["drink"] = synth(1.0) { t, n in (0..<3).reduce(0.0) { a, i in a + Self.burst(t, Double(i) * 0.3, 0.15) * n * 0.4 } }
        buffers["beacon"] = synth(1.2) { t, _ in (sin(2 * .pi * 120 * t) * 0.5 + sin(2 * .pi * 240 * t) * 0.3 + sin(2 * .pi * 360 * t) * 0.15) * min(1, t * 20) * min(1, (1.2 - t) * 6) * 0.7 }
        buffers["monstep"] = synth(0.6) { t, n in Self.thud(t, 0) * 0.6 + Self.burst(t, 0, 0.1) * n * 0.4 + Self.thud(t, 0.3) * 0.6 + Self.burst(t, 0.3, 0.1) * n * 0.4 }
        buffers["growl"] = synth(1.2) { t, n in (sin(2 * .pi * 58 * t + sin(2 * .pi * 23 * t) * 3) * 0.6 + n * 0.2) * sin(.pi * t / 1.2) }
        buffers["heart"] = synth(0.6) { t, _ in Self.thud(t, 0) + Self.thud(t, 0.22) * 0.7 }
        buffers["noclip"] = synth(2.4) { t, n in n * sin(.pi * t / 2.4) * 0.6 }
    }

    private func synth(_ seconds: Double, _ f: (Double, Double) -> Double) -> AVAudioPCMBuffer? {
        let frames = AVAudioFrameCount(seconds * rate)
        guard let b = AVAudioPCMBuffer(pcmFormat: mono, frameCapacity: frames), let data = b.floatChannelData?[0] else { return nil }
        b.frameLength = frames
        var lp = 0.0
        for i in 0..<Int(frames) {
            let t = Double(i) / rate
            lp = lp * 0.6 + (Double.random(in: -1...1)) * 0.4      // softened noise
            data[i] = Float(max(-1, min(1, f(t, lp))))
        }
        return b
    }

    private static func burst(_ t: Double, _ at: Double, _ len: Double) -> Double {
        let x = t - at
        return x < 0 || x > len ? 0 : exp(-x / (len / 4))
    }
    private static func thud(_ t: Double, _ at: Double) -> Double {
        let x = t - at
        return x < 0 || x > 0.12 ? 0 : sin(2 * .pi * (85 - 300 * x) * x) * exp(-x * 30)
    }
    private static func tone(_ t: Double, _ at: Double, _ f: Double, _ len: Double) -> Double {
        let x = t - at
        return x < 0 || x > len ? 0 : sin(2 * .pi * f * x) * exp(-x * 6)
    }
}
