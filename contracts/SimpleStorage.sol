// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleStorage
 * @dev A basic key-value store for Shardeum network
 * @notice Deploy this to test the Shardeum DevKit
 */
contract SimpleStorage {
    struct DataEntry {
        string value;
        uint256 timestamp;
        address setter;
        uint256 version;
    }

    mapping(string => DataEntry) private store;
    string[] private keys;
    address public owner;
    uint256 public totalEntries;

    event DataSet(string indexed key, string value, address indexed setter);
    event DataDeleted(string indexed key, address indexed deletedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleStorage: caller is not the owner");
        _;
    }

    modifier validKey(string memory key) {
        require(bytes(key).length > 0, "SimpleStorage: key cannot be empty");
        require(bytes(key).length <= 256, "SimpleStorage: key too long");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Set a key-value pair
     * @param key The key to set
     * @param value The value to store
     */
    function set(string memory key, string memory value) 
        external 
        validKey(key) 
    {
        require(bytes(value).length > 0, "Value cannot be empty");
        require(bytes(value).length <= 1024, "Value too long");

        bool isNew = bytes(store[key].value).length == 0;
        uint256 newVersion = store[key].version + 1;

        store[key] = DataEntry({
            value: value,
            timestamp: block.timestamp,
            setter: msg.sender,
            version: newVersion
        });

        if (isNew) {
            keys.push(key);
            totalEntries++;
        }

        emit DataSet(key, value, msg.sender);
    }

    /**
     * @dev Get a value by key
     */
    function get(string memory key) external view returns (DataEntry memory) {
        return store[key];
    }

    /**
     * @dev Get just the value string
     */
    function getValue(string memory key) external view returns (string memory) {
        return store[key].value;
    }

    /**
     * @dev Check if a key exists
     */
    function exists(string memory key) external view returns (bool) {
        return bytes(store[key].value).length > 0;
    }

    /**
     * @dev Delete a key (owner only)
     */
    function deleteKey(string memory key) external onlyOwner validKey(key) {
        require(bytes(store[key].value).length > 0, "Key does not exist");
        delete store[key];
        totalEntries--;
        emit DataDeleted(key, msg.sender);
    }

    /**
     * @dev Get all stored keys
     */
    function getAllKeys() external view returns (string[] memory) {
        return keys;
    }

    /**
     * @dev Get total number of keys
     */
    function getKeyCount() external view returns (uint256) {
        return keys.length;
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
