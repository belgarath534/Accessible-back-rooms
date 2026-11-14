// swift-tools-version:5.9
// The rules of Accessible Backrooms, with no screen or sound: the mazes, the
// levels, the monsters and everything the narrator says. The app draws and
// plays what this decides. Builds and tests on Linux too (`swift test`).
import PackageDescription

let package = Package(
    name: "BackroomsCore",
    defaultLocalization: "en",
    platforms: [.iOS(.v16), .macOS(.v13), .macCatalyst(.v16)],
    products: [.library(name: "BackroomsCore", targets: ["BackroomsCore"])],
    targets: [
        .target(name: "BackroomsCore", resources: [.copy("Resources/gamedata.json")]),
        .testTarget(name: "BackroomsCoreTests", dependencies: ["BackroomsCore"])
    ]
)
