import Foundation

public enum Lang: String, Codable, Sendable { case en, pt }

/// The narrator's words. English is written in the code; Portuguese comes
/// from the translation table, exactly like t() in the web version.
public struct Words: Sendable {
    public var lang: Lang
    let table: [String: String]
    public init(lang: Lang, data: GameData = .shared) { self.lang = lang; table = data.pt }

    public func t(_ s: String, _ v: [String: CustomStringConvertible] = [:]) -> String {
        var r = (lang == .pt ? table[s] : nil) ?? s
        if !v.isEmpty {
            for (k, val) in v { r = r.replacingOccurrences(of: "{\(k)}", with: val.description) }
            r = r.replacingOccurrences(of: " 1 rooms", with: " 1 room")
                 .replacingOccurrences(of: "umas 1 salas", with: "uma sala")
                 .replacingOccurrences(of: " 1 salas", with: " 1 sala")
        }
        return r
    }

    public func dirName(_ d: Int) -> String { t(["north", "east", "south", "west"][d]) }
    public func relName(_ r: Int) -> String { t(["ahead", "to your right", "behind you", "to your left"][r]) }
    public func relShort(_ r: Int) -> String { t(["ahead", "right", "back", "left"][r]) }
}

public extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
