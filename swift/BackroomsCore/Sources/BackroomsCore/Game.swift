import Foundation

/// Where a sound comes from, as heard by the player: x is to the right,
/// z negative is in front (the same as the web version's 3D sound).
public struct SoundPos: Equatable, Sendable {
    public var x: Double, y: Double, z: Double
    public init(_ x: Double, _ y: Double, _ z: Double) { self.x = x; self.y = y; self.z = z }
    public static let center = SoundPos(0, 0, -0.3)
}

/// Something the app should play. The core decides what and where; the app decides how it sounds.
public enum SoundEvent: Equatable, Sendable {
    case footstep(surface: String)
    case bump
    case turn(side: Int)                       // -1 left, 0 around, 1 right
    case pickup
    case drink
    case eat
    case click(on: Bool)
    case bang(at: SoundPos, volume: Double, muffle: Double)
    case beacon(kind: String, at: SoundPos, volume: Double, muffle: Double)
    case monster(type: String, at: SoundPos, volume: Double, muffle: Double)
    case monsterStep(type: String, at: SoundPos, volume: Double, muffle: Double)
    case heart(fast: Bool)
    case caught(type: String)
    case levelDone
    case gameOver
}

public enum Mode: String, Codable, Sendable { case story, extra }
public enum State: String, Sendable { case menu, play, transition, dead, won }

public struct Monster: Sendable {
    public var type: String
    public var at: Cell
    public var stuck = 0
    public var packed = false
    public var packAlert = 0
}

public struct Inventory: Codable, Sendable {
    public var water = 0, fire = 1, energy = 0, ration = 0
    public var battery = 0.0
    public var flashlight = false, light = false, radio = false, keycard = false
}

/// One game of Accessible Backrooms: the maze you are in, where everything is,
/// and the rules. Every action returns what the narrator says; the sounds to
/// play pile up in `sounds` for the app to take.
public final class Game {
    public let data: GameData
    public var words: Words
    public let dice: Dice
    public var difficulty: Difficulty

    public private(set) var mode: Mode = .story
    public private(set) var levelIndex = 0           // story: index in levels; extra: level number
    public private(set) var maze = Maze(w: 1, h: 1)
    public private(set) var pos = Cell(0, 0)
    public private(set) var facing = 0
    public private(set) var exit = Cell(0, 0)
    public private(set) var monsters: [Monster] = []
    public private(set) var items: [Cell: String] = [:]
    public private(set) var dark: Set<Cell> = []
    public private(set) var state: State = .menu
    public private(set) var sanity = 100.0
    public private(set) var steps = 0
    public var inv = Inventory()
    public private(set) var visited: Set<Cell> = []
    public private(set) var caughtThisLevel = false
    public var sounds: [SoundEvent] = []

    public private(set) var sneaking = false
    private var sprinted = false
    private var noise: (at: Cell, turns: Int)? = nil
    private var entBand = 99
    private var warned30 = false, warned15 = false
    private var wasDark = false

    public init(lang: Lang = .en, difficulty: String = "normal", dice: Dice = Dice(), data: GameData = .shared) {
        self.data = data
        self.words = Words(lang: lang, data: data)
        self.dice = dice
        self.difficulty = data.difficulties[difficulty] ?? data.difficulties["normal"]!
    }

    private func t(_ s: String, _ v: [String: CustomStringConvertible] = [:]) -> String { words.t(s, v) }
    public var lang: Lang { words.lang }

    public var level: LevelDef {
        switch mode {
        case .story: return data.levels[levelIndex]
        case .extra: return data.extras.first { $0.n == levelIndex } ?? data.extras[0]
        }
    }

    // MARK: starting

    /// Starts the story at a level, or an extra level by its number.
    @discardableResult
    public func start(mode: Mode, level: Int) -> String {
        self.mode = mode
        levelIndex = level
        sanity = 100; steps = 0; inv = Inventory()
        if mode == .extra || level >= 2 { inv.flashlight = true; inv.battery = 100 }
        newLevel()
        return introText()
    }

    public func introText() -> String { level.intro(lang) + " " + pathsText() }

    func newLevel() {
        let lv = level
        maze = Maze.generate(w: lv.w, h: lv.h, loops: lv.loops, dice: dice)
        pos = lv.run == true ? Cell(0, dice.int(lv.h)) : Cell(dice.int(lv.w), dice.int(lv.h))
        facing = dice.pick(maze.openDirs(pos))
        let dist = maze.distances(from: pos)
        var best = Cell(0, 0), bd = -1
        for y in 0..<lv.h { for x in 0..<lv.w where dist[Cell(x, y)] != Int.max && dist[Cell(x, y)] > bd { bd = dist[Cell(x, y)]; best = Cell(x, y) } }
        exit = best
        dark = []
        if lv.dark > 0 {
            for y in 0..<lv.h { for x in 0..<lv.w where dice.chance(lv.dark) { dark.insert(Cell(x, y)) } }
            if lv.dark < 1 { dark.remove(exit) }
        }
        var cells: [Cell] = []
        for y in 0..<lv.h { for x in 0..<lv.w { let c = Cell(x, y); if c != pos && c != exit { cells.append(c) } } }
        items = [:]
        func place(_ type: String, _ ok: (Cell) -> Bool = { _ in true }) {
            var c = cells.filter { items[$0] == nil && ok($0) }
            if c.isEmpty { c = cells.filter { items[$0] == nil } }
            if let p = dice.pickOrNil(c) { items[p] = type }
        }
        var it = lv.items
        if let w = it["water"] { it["water"] = max(1, w + difficulty.water) }
        if it["flashlight"] != nil && !inv.flashlight { place("flashlight") { dist[$0] >= 1 && dist[$0] <= 2 } }
        if it["radio"] != nil && !inv.radio { place("radio") { dist[$0] >= 3 } }
        for ty in ["water", "fire", "battery", "energy"] { for _ in 0..<(it[ty] ?? 0) { place(ty) { dist[$0] >= 2 } } }
        if lv.secret != true { place("ration") { dist[$0] >= 3 } }

        monsters = lv.mons.compactMap { type in
            guard data.monsters[type] != nil, type != "marcus" else { return nil }
            var c = cells.filter { dist[$0] >= max(5, Int(Double(bd) * 0.5)) }
            if c.isEmpty { c = cells }
            return Monster(type: type, at: dice.pick(c))
        }
        visited = [pos]; entBand = 99; caughtThisLevel = false; wasDark = false
        state = .play
        inv.light = inv.light && inv.battery > 0
    }

    // MARK: words about where you are

    func rel(_ d: Int) -> Int { (d - facing + 4) % 4 }
    func abs(_ r: Int) -> Int { (facing + r) % 4 }

    public func pathsText() -> String {
        let open = [0, 3, 1].filter { maze.isOpen(pos, abs($0)) }
        if open.isEmpty { return t("Dead end. The only way is back.") }
        let names = open.map { words.relShort($0) }
        let list = names.count == 1 ? names[0] : names.dropLast().joined(separator: ", ") + t(" and ") + names.last!
        return t("Paths: {list}.", ["list": list])
    }

    /// Words and a 3D position for something at a room, seen from where you stand.
    public func relDir(_ c: Cell) -> (words: String, pos: SoundPos, behind: Bool) {
        let vx = Double(c.x - pos.x), vy = Double(c.y - pos.y), f = facing, r = (facing + 1) % 4
        let fw = vx * Double(DX[f]) + vy * Double(DY[f]), rt = vx * Double(DX[r]) + vy * Double(DY[r])
        let len = max(hypot(fw, rt), 1)
        let w: String
        if Swift.abs(fw) >= 2 * Swift.abs(rt) { w = fw >= 0 ? "ahead of you" : "behind you" }
        else if Swift.abs(rt) >= 2 * Swift.abs(fw) { w = rt > 0 ? "to your right" : "to your left" }
        else { w = (fw > 0 ? "ahead" : "behind") + " and to the " + (rt > 0 ? "right" : "left") }
        return (t(w), SoundPos(rt / len, 0, -fw / len), fw < 0)
    }

    func routeWords(_ d: Int) -> String {
        let r = rel(d)
        return r == 0 ? t("straight ahead") : r == 2 ? t("back the way you came") : t("through the opening {dir}", ["dir": words.relName(r)])
    }

    public func isDark(_ c: Cell) -> Bool { dark.contains(c) }

    // MARK: actions

    /// Walks one room: r is 0 forward, 1 right, 2 back, 3 left (relative to where you face).
    public func move(_ r: Int) -> String {
        guard state == .play else { return notPlaying() }
        let d = abs(r)
        guard maze.isOpen(pos, d) else {
            sounds.append(.bump)
            return t("A wall blocks your way {dir}. {paths}", ["dir": words.relName(r), "paths": pathsText()])
        }
        facing = d
        pos = pos.step(d)
        sounds.append(.footstep(surface: level.step))
        let res = afterMove()
        if res.stop { return res.parts.filter { !$0.isEmpty }.joined(separator: " ") }
        let verb = t("{verb}.", ["verb": t(["Forward", "Right", "Back", "Left"][r])])
        return ([verb] + res.parts + [pathsText()]).filter { !$0.isEmpty }.joined(separator: " ")
    }

    public func turn(_ delta: Int) -> String {
        guard state == .play else { return notPlaying() }
        facing = (facing + delta + 4) % 4
        sounds.append(.turn(side: delta == 1 ? 1 : delta == 3 ? -1 : 0))
        let msg = delta == 2 ? "You turn around. Facing {d}. {paths}" : delta == 1 ? "You turn right. Facing {d}. {paths}" : "You turn left. Facing {d}. {paths}"
        return t(msg, ["d": words.dirName(facing), "paths": pathsText()])
    }

    public func look() -> String {
        guard state == .play else { return notPlaying() }
        let isDarkHere = isDark(pos) && !inv.light
        return [level.name(lang) + ".",
                isDarkHere ? t("It is too dark to see. You feel along the walls.") : dice.pick(level.flavor(lang)),
                t("You are facing {d}.", ["d": words.dirName(facing)]), pathsText(), monsterCues(force: true)]
            .filter { !$0.isEmpty }.joined(separator: " ")
    }

    public func listen() -> String {
        guard state == .play else { return notPlaying() }
        if sanity < 25 && dice.chance(0.3) { return t("You try to listen, but the sounds come from everywhere at once. You cannot focus.") }
        return t("You hold still and listen. {ex} {mon}", ["ex": exitCue(auto: false), "mon": monsterCues(force: true)])
            .trimmingCharacters(in: .whitespaces)
    }

    public func drink() -> String {
        guard state == .play else { return notPlaying() }
        if inv.water == 0 { return t("You have no almond water. Bottles are hidden around the level.") }
        if sanity >= 100 { return t("Your mind is already clear. Save it for later.") }
        inv.water -= 1; sanity = min(100, sanity + 30); sounds.append(.drink)
        return t("You drink almond water. It tastes sweet, like vanilla. Your head clears. Sanity is now {s} percent. {n} bottles left.",
                 ["s": Int(sanity.rounded()), "n": inv.water])
    }

    public func eat() -> String {
        guard state == .play else { return notPlaying() }
        if inv.ration == 0 { return t("You have no Royal Rations. They are hidden around the levels.") }
        inv.ration -= 1; sanity = min(100, sanity + 35); inv.energy += 1; sounds.append(.eat)
        return t("You eat a Royal Ration. It tastes like your favorite meal, warm and perfect. Sanity is now {s} percent, and you feel strong enough for one more sprint. {n} left.",
                 ["s": Int(sanity.rounded()), "n": inv.ration])
    }

    /// Flashlight: nil switches it, true on, false off.
    public func light(_ on: Bool? = nil) -> String {
        guard state == .play else { return notPlaying() }
        if !inv.flashlight { return t("You do not have a flashlight yet.") }
        let want = on ?? !inv.light
        if want && inv.battery <= 0 { return t("The flashlight is dead. You need a battery.") }
        inv.light = want; wasDark = false
        sounds.append(.click(on: want))
        guard want else { return t("Flashlight off.") }
        var extra = ""
        let dist = maze.distances(from: pos)
        if monsters.contains(where: { $0.type == "smiler" && dist[$0.at] <= 3 }) { extra = t(" Something hisses and scrambles away from the light.") }
        if monsters.contains(where: { $0.type == "moths" }) { extra += t(" Somewhere in the dark, wings start to flutter.") }
        return t("Flashlight on. Battery {n} percent.{extra}", ["n": Int(inv.battery.rounded()), "extra": extra])
    }

    public func sneak(_ on: Bool? = nil) -> String {
        guard state == .play else { return notPlaying() }
        sneaking = on ?? !sneaking
        return t(sneaking ? "You crouch low and move quietly. Monsters only notice you up close, but sneaking wears on your nerves." : "You stand up and walk normally.")
    }

    /// Throws a firecracker down an open hall (r relative, like move). Monsters go to the bang.
    public func throwFirecracker(_ r0: Int = 0) -> String {
        guard state == .play else { return notPlaying() }
        if inv.fire == 0 { return t("You have no firecrackers.") }
        var r = r0
        if r == 0 && !maze.isOpen(pos, abs(0)), let o = [1, 3, 2].first(where: { maze.isOpen(pos, abs($0)) }) { r = o }
        let d = abs(r)
        var c = pos, n = 0
        while n < 4 && maze.isOpen(c, d) { c = c.step(d); n += 1 }
        if n == 0 { return t("There is a wall {dir}. Throw it down an open path. {paths}", ["dir": words.relName(r), "paths": pathsText()]) }
        inv.fire -= 1
        noise = (c, 5)
        let rd = relDir(c)
        sounds.append(.bang(at: rd.pos, volume: min(1, max(0.3, 1 - Double(n) * 0.15)), muffle: Double(n) * 0.1))
        let nd0 = maze.distances(from: c)
        let lured = monsters.contains { (data.monsters[$0.type]?.hostile ?? false) && $0.type != "chaser" && nd0[$0.at] <= 10 }
        steps += 1; drain(0.5); monstersTurn()
        var parts: [String] = []
        _ = checkCaught(&parts)
        if sanity <= 0 { gameOver(&parts); return parts.joined(separator: " ") }
        return t("You light a firecracker and throw it {dir}. It bangs {n} rooms away. Anything nearby will go to the noise. {caught} {paths}",
                 ["dir": r == 0 ? t("down the hall ahead") : words.relName(r), "n": n,
                  "caught": (lured ? t("Something rushes toward the bang.") + " " : "") + parts.joined(separator: " "), "paths": pathsText()])
    }

    /// Runs two rooms at once, using one sprint. Loud: monsters notice you from farther away.
    public func sprint(_ r: Int = 0) -> String {
        guard state == .play else { return notPlaying() }
        if inv.energy <= 0 { return t("You are too tired to sprint. Find energy bars. {paths}", ["paths": pathsText()]) }
        let d0 = abs(r)
        guard maze.isOpen(pos, d0) else { sounds.append(.bump); return t("A wall blocks your way {dir}. {paths}", ["dir": words.relName(r), "paths": pathsText()]) }
        inv.energy -= 1; sprinted = true; facing = d0
        var moved = 0
        var early: [String] = []
        for i in 0..<2 {
            guard maze.isOpen(pos, facing) else { break }
            pos = pos.step(facing); moved += 1
            sounds.append(.footstep(surface: level.step))
            if i == 0 {
                visited.insert(pos)
                if checkCaught(&early) || items[pos] != nil || pos == exit { break }
            }
        }
        let res = afterMove()
        sprinted = false
        if res.stop { return (early + res.parts).filter { !$0.isEmpty }.joined(separator: " ") }
        let dir = r == 0 ? t("forward") : words.relName(r)
        return ([t(moved > 1 ? "You sprint {dir}, two rooms!" : "You sprint {dir}!", ["dir": dir])] + early + res.parts + [pathsText()])
            .filter { !$0.isEmpty }.joined(separator: " ")
    }

    public func status() -> String {
        [level.name(lang) + ".", t("Sanity") + " " + "\(Int(sanity.rounded()))%.", t("You are facing {d}.", ["d": words.dirName(facing)]), pathsText()].joined(separator: " ")
    }

    func notPlaying() -> String {
        switch state {
        case .dead: return t("You lost your mind. Say try again, or menu.")
        case .transition: return ""
        default: return t("Say play to start a new game.")
        }
    }

    // MARK: after each step

    struct StepResult { var parts: [String]; var stop: Bool }

    func afterMove() -> StepResult {
        var parts: [String] = []
        steps += 1
        drain()
        let firstVisit = !visited.contains(pos)
        visited.insert(pos)
        var caught = checkCaught(&parts)
        pickup(&parts)
        if pos == exit {
            levelComplete(&parts)
            return StepResult(parts: parts, stop: true)
        }
        monstersTurn()
        if !caught { caught = checkCaught(&parts) }
        if sanity <= 0 { gameOver(&parts); return StepResult(parts: parts, stop: true) }
        if firstVisit && dice.chance(0.28) { parts.insert(dice.pick(level.flavor(lang)), at: 0) }
        let darkNow = isDark(pos) && !inv.light
        if darkNow && level.dark < 1 && !wasDark { parts.insert(t("It is dark here."), at: 0) }
        wasDark = darkNow
        let cue = monsterCues(force: false)
        if !cue.isEmpty { parts.append(cue) }
        let exDist = maze.distances(from: exit)[pos]
        if exDist <= 3 { let ex = exitCue(auto: true); if exDist == 1 { parts.append(t("The exit is very close. ") + ex) } }
        parts.append(lowSanity())
        return StepResult(parts: parts, stop: false)
    }

    func drain(_ mult: Double = 1) {
        var d = difficulty.drain * mult
        if sneaking { d *= 1.2 }
        if isDark(pos) && !inv.light { d *= level.dark >= 1 ? 1.15 : 1.35 }
        if level.calm == true { d *= 0.4 }
        sanity = max(0, sanity - d)
        if inv.light {
            inv.battery = max(0, inv.battery - 1.5)
            if inv.battery <= 0 { inv.light = false }
        }
    }

    func lowSanity() -> String {
        var r = ""
        if sanity <= 30 && !warned30 { warned30 = true; r = t("Your hands are shaking. Your sanity is getting low. Drink almond water if you have any.") }
        if sanity <= 15 && !warned15 { warned15 = true; r = t("The walls seem to breathe. You are close to losing your mind.") }
        if sanity > 30 { warned30 = false }
        if sanity > 15 { warned15 = false }
        return r
    }

    func pickup(_ parts: inout [String]) {
        guard let ty = items.removeValue(forKey: pos) else { return }
        sounds.append(.pickup)
        switch ty {
        case "water": inv.water += 1; parts.append(t("You find a bottle of almond water. You have {n}.", ["n": inv.water]))
        case "fire": inv.fire += 1; parts.append(t("You find a firecracker. You have {n}. Say throw to use it.", ["n": inv.fire]))
        case "battery":
            inv.battery = min(100, inv.battery + 50)
            parts.append(inv.flashlight ? t("You find a battery. Flashlight charge: {n} percent.", ["n": Int(inv.battery.rounded())]) : t("You find a battery. It might be useful for a flashlight."))
        case "energy": inv.energy += 3; parts.append(t("You find an energy bar and eat it. You can sprint {n} times. Say sprint to run.", ["n": inv.energy]))
        case "flashlight": inv.flashlight = true; inv.battery = max(inv.battery, 80); parts.append(t("You find a flashlight! Say light to switch it on or off. It scares Smilers, but batteries run out."))
        case "radio": inv.radio = true; parts.append(t("You find a walkie-talkie. Its static gets stronger near the exit. Say radio to check it."))
        case "ration": inv.ration += 1; parts.append(t("You find a Royal Ration, a sealed tin of food. You have {n}. Say eat to get your strength back.", ["n": inv.ration]))
        default: break
        }
    }

    // MARK: monsters

    func monstersTurn() {
        let dist = maze.distances(from: pos)
        let before = monsters.map(\.at)
        var nd: Distances? = nil
        if let n = noise { nd = maze.distances(from: n.at); noise = n.turns <= 1 ? nil : (n.at, n.turns - 1) }
        for i in monsters.indices {
            var m = monsters[i]
            guard let T = data.monsters[m.type] else { continue }
            let d = dist[m.at]
            if m.stuck > 0 { m.stuck -= 1; monsters[i] = m; continue }
            if T.npc == true { if dice.chance(0.3) { wander(&m) }; monsters[i] = m; continue }
            if let nd, T.hostile, m.type != "chaser", nd[m.at] <= 10, nd[m.at] > 0 {
                if dice.chance(0.95), let s = maze.step(from: m.at, toward: nd, dice: dice) { m.at = m.at.step(s) }
                monsters[i] = m; continue
            }
            var sense = T.sense + difficulty.sense
            if sneaking { sense = min(sense, 2) }
            if sprinted { sense += 3 }
            if m.packAlert > 0 { m.packAlert -= 1; sense += 6 }
            var hunting = d <= sense
            if m.type == "hound" && hunting && !m.packed {
                m.packed = true
                for j in monsters.indices where j != i && monsters[j].type == "hound" { monsters[j].packAlert = 5 }
            }
            if m.type == "hound" && !hunting && d > sense + 3 { m.packed = false }
            if m.type == "smiler" {
                if inv.light && d <= 3 { if let s = maze.step(from: m.at, toward: dist, away: true, dice: dice) { m.at = m.at.step(s) }; monsters[i] = m; continue }
                hunting = hunting && isDark(pos) && !inv.light
            }
            if hunting {
                if dice.chance(T.chase * difficulty.chase), let s = maze.step(from: m.at, toward: dist, dice: dice) { m.at = m.at.step(s) }
            } else if dice.chance(0.5) { wander(&m) }
            monsters[i] = m
        }
        // footsteps of what just moved nearby, nearest first
        let d2 = maze.distances(from: pos)
        let moved = monsters.enumerated().filter { $0.element.at != before[$0.offset] && d2[$0.element.at] <= 7 && d2[$0.element.at] > 0 }
            .sorted { d2[$0.element.at] < d2[$1.element.at] }.prefix(2)
        for (_, m) in moved {
            let r = relDir(m.at), dd = Double(d2[m.at])
            sounds.append(.monsterStep(type: m.type, at: r.pos, volume: min(1, max(0.12, 1.05 - dd * 0.13)), muffle: min(0.85, max(0, (dd - 1) * 0.12 + (r.behind ? 0.15 : 0)))))
        }
    }

    func wander(_ m: inout Monster) {
        let ds = maze.openDirs(m.at)
        if let d = dice.pickOrNil(ds) { m.at = m.at.step(d) }
    }

    func checkCaught(_ parts: inout [String]) -> Bool {
        for i in monsters.indices where monsters[i].at == pos && (data.monsters[monsters[i].type]?.hostile ?? false) {
            parts.append(caughtBy(i))
            return true
        }
        return false
    }

    static let caughtLines: [String: String] = [
        "howler": "The Howler was waiting for you in the dark. It grabs you, its face inches from yours, screaming!",
        "smiler": "A Smiler opens its grin right in front of you. Hundreds of teeth!",
        "hound": "A Hound slams into you, snapping and snarling!",
        "skin": "The Skin-Stealer grabs you. It has a face. It is wearing your face!",
        "party": "A Partygoer hugs you. It will not let go. Hello, friend!",
        "clump": "The Clump rolls over you. Dozens of hands pull at you, and dozens of mouths whisper your name.",
        "wretch": "A Wretch tackles you, clawing and wheezing. Its eyes are completely empty!",
    ]

    func caughtBy(_ i: Int) -> String {
        let m = monsters[i]
        sounds.append(.caught(type: m.type))
        let hit = difficulty.hit.rounded()
        sanity = max(0, sanity - hit)
        caughtThisLevel = true
        let dist = maze.distances(from: pos)
        var far: [Cell] = []
        for y in 0..<maze.h { for x in 0..<maze.w where dist[Cell(x, y)] >= 6 && dist[Cell(x, y)] != Int.max { far.append(Cell(x, y)) } }
        monsters[i].at = dice.pickOrNil(far) ?? exit
        let name = data.monsters[m.type]?.name(lang) ?? m.type
        let how = Self.caughtLines[m.type].map { t($0) } ?? t("{Name} grabs you!", ["Name": name.capitalizedFirst])
        return t("{how} You tear free and run blindly. You lose {n} sanity.", ["how": how, "n": Int(hit)])
    }

    /// What you hear of the monsters; with force (listen, look) it always reports.
    public func monsterCues(force: Bool) -> String {
        let dist = maze.distances(from: pos)
        var nearest: Monster? = nil, nd = 99
        for m in monsters {
            guard let T = data.monsters[m.type], T.npc != true else { continue }
            let d = dist[m.at]
            if d < nd { nd = d; nearest = m }
        }
        guard let m = nearest, let T = data.monsters[m.type] else { return "" }
        let d = nd, r = relDir(m.at), sense = T.sense + difficulty.sense
        if d <= sense + 1 && (d <= 3 || dice.chance(0.7)) {
            sounds.append(.monster(type: m.type, at: r.pos, volume: min(1, max(0.12, 1.15 - Double(d) * 0.17)),
                                   muffle: min(0.9, max(0, Double(d - 1) * 0.14 + (r.behind ? 0.2 : 0)))))
        }
        let band = d <= 1 ? 1 : d <= 3 ? 2 : d <= sense ? 3 : 4
        let v: [String: CustomStringConvertible] = ["w": r.words, "sound": T.sound(lang), "name": T.name(lang), "Name": T.name(lang).capitalizedFirst, "n": d]
        var text = ""
        if band <= 2 || band != entBand || force {
            text = band == 1 ? t("Danger! {Name} is right next to you, {w}. Run!", v)
                 : band == 2 ? t("You hear {sound} close by, {w}.", v)
                 : band == 3 ? t("Somewhere {w}, you hear {sound}.", v)
                 : force ? t("You cannot hear {name} right now.", v) : ""
        }
        if band <= 2 { sounds.append(.heart(fast: band == 1)) }
        entBand = band
        return text
    }

    func exitCue(auto: Bool) -> String {
        let dist = maze.distances(from: exit)
        let d = dist[pos]
        let r = relDir(exit)
        if !auto || d <= 3 {
            sounds.append(.beacon(kind: level.beacon, at: r.pos, volume: min(1, max(0.15, 1.1 - Double(d) * 0.07)),
                                  muffle: min(0.85, max(0, Double(d) * 0.06 + (r.behind ? 0.2 : 0)))))
        }
        guard let s = maze.step(from: pos, toward: dist, dice: dice) else { return "" }
        return t(d == 1 ? "You hear {what}. The way to it leads {route}, 1 step away." : "You hear {what}. The way to it leads {route}, about {n} steps away.",
                 ["what": level.exitWhat(lang), "route": routeWords(s), "n": d])
    }

    // MARK: endings

    func levelComplete(_ parts: inout [String]) {
        sounds.append(.levelDone)
        if mode == .story && level.final == true {
            state = .won
            parts.append(t("You open your front door and step out onto the porch. Sunlight. Birds. A neighbor mowing the lawn waves at you. Your phone buzzes in your pocket: thirty-seven missed calls. You are home. Behind you, very faintly, something hums like a fluorescent light. Then it stops. You escaped the Backrooms!"))
            return
        }
        state = .transition
        parts.append(level.exitText(lang))
        parts.append(t(mode == .story ? "You feel yourself falling through reality." : "You feel yourself falling deeper."))
    }

    /// Goes on after an exit: the next story level, or the next extra level.
    @discardableResult
    public func continueToNext() -> String? {
        guard state == .transition else { return nil }
        switch mode {
        case .story:
            var next = levelIndex + 1
            while next < data.levels.count && data.levels[next].secret == true { next += 1 }
            if next >= data.levels.count { state = .won; return nil }
            levelIndex = next
        case .extra:
            guard data.extras.contains(where: { $0.n == levelIndex + 1 }) else { state = .won; return nil }
            levelIndex += 1
        }
        sanity = min(100, sanity + 25)
        newLevel()
        return introText()
    }

    func gameOver(_ parts: inout [String]) {
        state = .dead
        sounds.append(.gameOver)
        parts.append(t("Your sanity hits zero. The hum fills your head until there is nothing else. You become part of the Backrooms. Say try again to restart {name} from the checkpoint, or say menu.", ["name": level.name(lang)]))
    }

    /// Starts the current level again after losing.
    @discardableResult
    public func retry() -> String {
        sanity = 100
        newLevel()
        return introText()
    }

    public func takeSounds() -> [SoundEvent] { defer { sounds = [] }; return sounds }
}
