import XCTest
@testable import BackroomsCoreTests

fileprivate extension CoreTests {
    @available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
    static nonisolated(unsafe) let __allTests__CoreTests = [
        ("testCanReachEveryExit", testCanReachEveryExit),
        ("testDataLoads", testDataLoads),
        ("testItemsAndActions", testItemsAndActions),
        ("testListenPointsToTheExit", testListenPointsToTheExit),
        ("testMazeIsConnected", testMazeIsConnected),
        ("testPortugueseWords", testPortugueseWords),
        ("testSameSeedSameMaze", testSameSeedSameMaze),
        ("testWallBlocks", testWallBlocks)
    ]
}
@available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
func __BackroomsCoreTests__allTests() -> [XCTestCaseEntry] {
    return [
        testCase(CoreTests.__allTests__CoreTests)
    ]
}