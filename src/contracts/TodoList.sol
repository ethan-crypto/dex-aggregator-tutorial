// SPDX-License-Identifier: MIT

pragma solidity ^0.8;

contract TodoList {
    struct Todo{
        string message;
        bool completed;
    }
    Todo[] public todos;
    event Add (
        address indexed user,
        string message,
        uint timestamp
    );
    event ToggleCompleted (
        address indexed user,
        bool completed,
        uint timestamp
    );
    function add (string calldata _message) external {
        todos.push(Todo({message: _message, completed: false}));
        emit Add(msg.sender, _message, block.timestamp);
    }
    function updateMessage(string calldata _message, uint _index) external {
        todos[_index].message = _message;
    }
    function toggleCompleted (uint _index) external {
        todos[_index].completed = !todos[_index].completed;
        emit ToggleCompleted(msg.sender, !todos[_index].completed, block.timestamp);
    }
}