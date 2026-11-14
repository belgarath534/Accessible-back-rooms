import Foundation

/// Directions: 0 north, 1 east, 2 south, 3 west.
public let DX = [0, 1, 0, -1]
public let DY = [-1, 0, 1, 0]

public struct Cell: Hashable, Codable, Sendable {
    public var x: Int, y: Int
    public init(_ x: Int, _ y: Int) { self.x = x; self.y = y }
    public func step(_ d: Int) -> Cell { Cell(x + DX[d], y + DY[d]) }
}

/// A grid of rooms. Each room keeps four wall bits (1 north, 2 east, 4 south, 8 west).
public struct Maze: Sendable {
    public let w: Int, h: Int
    public var walls: [UInt8]

    public init(w: Int, h: Int) { self.w = w; self.h = h; walls = Array(repeating: 15, count: w * h) }

    public func inside(_ c: Cell) -> Bool { c.x >= 0 && c.y >= 0 && c.x < w && c.y < h }
    public func isOpen(_ c: Cell, _ d: Int) -> Bool { walls[c.y * w + c.x] & (1 << d) == 0 }
    public func openDirs(_ c: Cell) -> [Int] { (0..<4).filter { isOpen(c, $0) } }

    public mutating func carve(_ c: Cell, _ d: Int) {
        let n = c.step(d)
        guard inside(n), inside(c) else { return }
        walls[c.y * w + c.x] &= ~UInt8(1 << d)
        walls[n.y * w + n.x] &= ~UInt8(1 << ((d + 2) % 4))
    }

    /// Same recipe as the web version: a depth-first maze, then some extra
    /// openings (loops), and on loopy levels a few small open 2x2 rooms.
    public static func generate(w: Int, h: Int, loops: Double, dice: Dice) -> Maze {
        var m = Maze(w: w, h: h)
        var seen = Array(repeating: false, count: w * h)
        var stack = [Cell(dice.int(w), dice.int(h))]
        seen[stack[0].y * w + stack[0].x] = true
        while let c = stack.last {
            let ns = (0..<4).filter { d in let n = c.step(d); return m.inside(n) && !seen[n.y * w + n.x] }
            if ns.isEmpty { stack.removeLast(); continue }
            let d = dice.pick(ns)
            m.carve(c, d)
            let n = c.step(d)
            seen[n.y * w + n.x] = true
            stack.append(n)
        }
        for _ in 0..<Int((Double(w * h) * loops).rounded(.down)) { m.carve(Cell(dice.int(w), dice.int(h)), dice.int(4)) }
        if loops > 0.1 {
            for _ in 0..<(w * h / 22) {
                let x = dice.int(w - 1), y = dice.int(h - 1)
                m.carve(Cell(x, y), 1); m.carve(Cell(x, y), 2); m.carve(Cell(x + 1, y), 2); m.carve(Cell(x, y + 1), 1)
            }
        }
        return m
    }

    /// Steps from `from` to every room (Int.max where unreachable). `allowed` limits which rooms can be crossed.
    public func distances(from: Cell, allowed: Set<Cell>? = nil) -> Distances {
        var d = Array(repeating: Int.max, count: w * h)
        d[from.y * w + from.x] = 0
        var q = [from], i = 0
        while i < q.count {
            let c = q[i]; i += 1
            for dir in 0..<4 where isOpen(c, dir) {
                let n = c.step(dir)
                if let a = allowed, !a.contains(n) { continue }
                if d[n.y * w + n.x] > d[c.y * w + c.x] + 1 { d[n.y * w + n.x] = d[c.y * w + c.x] + 1; q.append(n) }
            }
        }
        return Distances(w: w, values: d)
    }

    /// The direction from `c` that gets closer (or farther) by `dist`, or nil.
    public func step(from c: Cell, toward dist: Distances, away: Bool = false, dice: Dice) -> Int? {
        var best: Int? = nil, bd = dist[c]
        for d in dice.shuffled([0, 1, 2, 3]) where isOpen(c, d) {
            let v = dist[c.step(d)]
            if away ? v > bd : v < bd { bd = v; best = d }
        }
        return best
    }
}

public struct Distances: Sendable {
    let w: Int
    let values: [Int]
    public subscript(_ c: Cell) -> Int { values[c.y * w + c.x] }
}
