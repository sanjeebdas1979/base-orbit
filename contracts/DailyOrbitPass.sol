// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Daily Orbit Pass
/// @notice Allows one gas-only activation per wallet per UTC day.
contract DailyOrbitPass {
    /// @dev Stores currentDayId + 1.
    /// Zero means the wallet has never activated.
    mapping(address => uint256) public lastActivatedDayPlusOne;

    mapping(address => bool) public hasActivatedBefore;

    uint256 public totalActivations;
    uint256 public totalUniquePilots;

    error OrbitAlreadyActiveToday();

    event DailyOrbitActivated(
        address indexed pilot,
        uint256 indexed dayId,
        uint256 activatedAt
    );

    function currentDayId() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function activateDailyOrbit() external {
        uint256 dayId = currentDayId();
        uint256 storedDay = dayId + 1;

        if (lastActivatedDayPlusOne[msg.sender] == storedDay) {
            revert OrbitAlreadyActiveToday();
        }

        lastActivatedDayPlusOne[msg.sender] = storedDay;

        unchecked {
            totalActivations++;
        }

        if (!hasActivatedBefore[msg.sender]) {
            hasActivatedBefore[msg.sender] = true;

            unchecked {
                totalUniquePilots++;
            }
        }

        emit DailyOrbitActivated(
            msg.sender,
            dayId,
            block.timestamp
        );
    }

    function hasActivePass(address pilot) public view returns (bool) {
        return (
            lastActivatedDayPlusOne[pilot] ==
            currentDayId() + 1
        );
    }

    function secondsUntilReset() external view returns (uint256) {
        return 1 days - (block.timestamp % 1 days);
    }
}