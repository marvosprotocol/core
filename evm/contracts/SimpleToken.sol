// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract SampleToken is ERC20Upgradeable {
    function initialize(uint256 totalSupply) public initializer {
        __ERC20_init("SampleToken", "SIM");
        _mint(msg.sender, totalSupply);
    }
}
