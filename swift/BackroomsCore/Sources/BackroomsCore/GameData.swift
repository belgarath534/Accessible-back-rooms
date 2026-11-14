import Foundation

/// Everything written for the game: levels, monsters, texts and the
/// Portuguese translations. Exported once from the web version into
/// Resources/gamedata.json; from now on this copy is the Swift version's own.
public struct GameData: Decodable, Sendable {
    public let levels: [LevelDef]
    public let extras: [LevelDef]
    public let monsters: [String: MonsterType]
    public let bestiaryOrder: [String]
    public let pt: [String: String]
    public let art: [String: Translated]
    public let monArt: [String: Translated]
    public let achievements: [AchievementDef]
    public let difficulties: [String: Difficulty]
    public let tapes: [String: [String]]
    public let notes: [String: [String]]
    public let firstExtra: Int
    public let tracks: [String]
    public let commandNames: [String: [String: String]]

    public static let shared: GameData = {
        guard let url = Bundle.module.url(forResource: "gamedata", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { fatalError("gamedata.json is missing") }
        do { return try JSONDecoder().decode(GameData.self, from: data) } catch { fatalError("gamedata.json: \(error)") }
    }()
}

public struct Translated: Decodable, Sendable {
    public let en: String
    public let pt: String
    public func text(_ lang: Lang) -> String { lang == .pt ? pt : en }
}

public struct LevelText: Decodable, Sendable {
    public let name: String?
    public let short: String?
    public let exitWhat: String?
    public let intro: String?
    public let exitText: String?
    public let flavor: [String]?
}

public struct LevelDef: Decodable, Sendable {
    public let n: Int?                 // extra levels: their number (15 to 50)
    public let name: String
    public let short: String
    public let tape: Int?
    public let w: Int
    public let h: Int
    public let loops: Double
    public let mons: [String]
    public let dark: Double
    public let lights: Bool
    public let items: [String: Int]
    public let wall: [Double]
    public let floor: [Double]
    public let ceil: [Double]
    public let amb: String
    public let music: String
    public let step: String
    public let beacon: String
    public let exitWhat: String
    public let intro: String
    public let exitText: String
    public let flavor: [String]
    public let pt: LevelText
    public let hazards: Double?
    public let puzzle: String?
    public let hides: Int?
    public let codelock: Bool?
    public let water: Double?
    public let calm: Bool?
    public let memory: Bool?
    public let locked: Bool?
    public let run: Bool?
    public let final: Bool?
    public let boss: Bool?
    public let secret: Bool?

    public func name(_ l: Lang) -> String { l == .pt ? (pt.name ?? name) : name }
    public func exitWhat(_ l: Lang) -> String { l == .pt ? (pt.exitWhat ?? exitWhat) : exitWhat }
    public func intro(_ l: Lang) -> String { l == .pt ? (pt.intro ?? intro) : intro }
    public func exitText(_ l: Lang) -> String { l == .pt ? (pt.exitText ?? exitText) : exitText }
    public func flavor(_ l: Lang) -> [String] { l == .pt ? (pt.flavor ?? flavor) : flavor }
}

public struct MonsterText: Decodable, Sendable { public let name: String; public let sound: String }

public struct MonsterType: Decodable, Sendable {
    public let name: String
    public let sound: String
    public let pt: MonsterText
    public let sfx: [String]?
    public let sense: Int
    public let chase: Double
    public let hostile: Bool
    public let npc: Bool?
    public let copier: Bool?
    public func name(_ l: Lang) -> String { l == .pt ? pt.name : name }
    public func sound(_ l: Lang) -> String { l == .pt ? pt.sound : sound }
}

public struct AchievementDef: Decodable, Sendable {
    public let id: String
    public let secret: Bool?
    public let en: [String]
    public let pt: [String]
    public func title(_ l: Lang) -> String { (l == .pt ? pt : en)[0] }
    public func detail(_ l: Lang) -> String { (l == .pt ? pt : en)[1] }
}

public struct Difficulty: Decodable, Sendable {
    public let label: String
    public let drain: Double
    public let hit: Double
    public let scare: Double
    public let water: Int
    public let chase: Double
    public let idle: Double
    public let sense: Int
    public let moth: Double
}
