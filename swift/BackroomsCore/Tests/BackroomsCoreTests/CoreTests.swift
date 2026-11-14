import XCTest
@testable import BackroomsCore

final class CoreTests: XCTestCase {
    func testDataLoads() {
        let d = GameData.shared
        XCTAssertEqual(d.levels.first?.name, "Level 0, The Lobby")
        XCTAssertEqual(d.extras.last?.n, 50)
        XCTAssertNotNil(d.monsters["lookalike"])
        XCTAssertGreaterThan(d.pt.count, 500)
        XCTAssertGreaterThanOrEqual(d.achievements.count, 49)
    }

    func testMazeIsConnected() {
        let dice = Dice(SeededRandom(seed: 7))
        for _ in 0..<50 {
            let m = Maze.generate(w: 12, h: 10, loops: 0.2, dice: dice)
            let d = m.distances(from: Cell(0, 0))
            for y in 0..<10 { for x in 0..<12 { XCTAssertNotEqual(d[Cell(x, y)], Int.max) } }
        }
    }

    func testSameSeedSameMaze() {
        let a = Maze.generate(w: 9, h: 9, loops: 0.16, dice: Dice(SeededRandom(seed: 42)))
        let b = Maze.generate(w: 9, h: 9, loops: 0.16, dice: Dice(SeededRandom(seed: 42)))
        XCTAssertEqual(a.walls, b.walls)
    }

    func testPortugueseWords() {
        let w = Words(lang: .pt)
        XCTAssertEqual(w.t("Sanity"), "Sanidade")
        XCTAssertTrue(w.t("Paths: {list}.", ["list": "x"]).contains("x"))
    }

    /// Walks every story level by following the exit, and checks the narrator never goes silent.
    func testCanReachEveryExit() {
        for lang in [Lang.en, .pt] {
            let g = Game(lang: lang, difficulty: "easy", dice: Dice(SeededRandom(seed: 3)))
            var said = g.start(mode: .story, level: 0)
            XCTAssertFalse(said.isEmpty)
            var levels = 0
            for _ in 0..<5000 {
                if g.state == .transition { levels += 1; guard let s = g.continueToNext() else { break }; said = s; XCTAssertFalse(said.isEmpty); continue }
                if g.state == .won { break }
                if g.state == .dead { said = g.retry(); continue }
                let dist = g.maze.distances(from: g.exit)
                guard let d = g.maze.step(from: g.pos, toward: dist, dice: g.dice) else { XCTFail("no way to the exit"); break }
                said = g.move((d - g.facing + 4) % 4)
                XCTAssertFalse(said.isEmpty, "level \(g.level.name) state \(g.state)")
                _ = g.takeSounds()
            }
            XCTAssertEqual(g.state, .won, "\(lang): finished \(levels) levels")
            XCTAssertEqual(levels, 14)
        }
    }

    func testListenPointsToTheExit() {
        let g = Game(dice: Dice(SeededRandom(seed: 11)))
        g.start(mode: .extra, level: 30)
        let s = g.listen()
        XCTAssertTrue(s.contains(g.level.exitWhat(.en)), s)
        XCTAssertTrue(g.takeSounds().contains { if case .beacon = $0 { return true }; return false })
    }

    func testWallBlocks() {
        let g = Game(dice: Dice(SeededRandom(seed: 5)))
        g.start(mode: .story, level: 0)
        for r in 0..<4 where !g.maze.isOpen(g.pos, (g.facing + r) % 4) {
            let before = g.pos
            XCTAssertTrue(g.move(r).hasPrefix("A wall blocks your way"))
            XCTAssertEqual(g.pos, before)
            return
        }
    }

    func testItemsAndActions() {
        let g = Game(dice: Dice(SeededRandom(seed: 9)))
        g.start(mode: .extra, level: 20)
        XCTAssertTrue(g.light(true).hasPrefix("Flashlight on"))
        XCTAssertEqual(g.light(false), "Flashlight off.")
        XCTAssertTrue(g.sneak().contains("crouch"))
        XCTAssertTrue(g.eat().contains("no Royal Rations"))
        g.inv.energy = 1
        let s = g.sprint(0)
        XCTAssertFalse(s.isEmpty)
        let fire = g.throwFirecracker(0)
        XCTAssertTrue(fire.contains("firecracker") || fire.contains("wall"), fire)
        let p = Game(lang: .pt, dice: Dice(SeededRandom(seed: 9)))
        p.start(mode: .story, level: 2)
        XCTAssertTrue(p.light(true).hasPrefix("Lanterna"), p.light(false))
    }
}
