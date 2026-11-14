import Foundation

/// Where the game's randomness comes from. The game uses the system's in
/// normal play; tests and the daily challenge use a seeded one, so the same
/// seed always builds the same maze.
public protocol GameRandom {
    mutating func next() -> Double   // 0 ..< 1
}

public struct SystemRandom: GameRandom {
    public init() {}
    public mutating func next() -> Double { Double.random(in: 0..<1) }
}

/// Small, fast seeded generator (mulberry32), the same kind the web version uses.
public struct SeededRandom: GameRandom {
    private var state: UInt32
    public init(seed: UInt32) { state = seed }
    public mutating func next() -> Double {
        state &+= 0x6D2B79F5
        var t = state
        t = (t ^ (t >> 15)) &* (t | 1)
        t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
        return Double(t ^ (t >> 14)) / 4294967296.0
    }
}

/// Wraps a generator so the game can hold any kind.
public final class Dice {
    private var source: any GameRandom
    public init(_ source: any GameRandom = SystemRandom()) { self.source = source }
    public func chance(_ p: Double) -> Bool { source.next() < p }
    public func int(_ n: Int) -> Int { n <= 0 ? 0 : min(n - 1, Int(source.next() * Double(n))) }
    public func pick<T>(_ a: [T]) -> T { a[int(a.count)] }
    public func pickOrNil<T>(_ a: [T]) -> T? { a.isEmpty ? nil : pick(a) }
    public func shuffled<T>(_ a: [T]) -> [T] {
        var r = a
        if r.count > 1 { for i in stride(from: r.count - 1, to: 0, by: -1) { r.swapAt(i, int(i + 1)) } }
        return r
    }
}
