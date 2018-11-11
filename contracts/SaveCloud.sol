pragma solidity ^0.4.16;
import "./TokenERC20.sol";


contract SaveCloud {
    enum IsFinish {Yes, No}

    IsFinish isFinish;
    address private owner;
    uint public saveIndex;
    mapping (address=>string[]) public ipfs;
    TokenERC20 public token;
    
    event Upload(string ipfsAddress );
    event Download(uint number);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function SaveCloud() public {
        owner = msg.sender;
        saveIndex = 0;
        isFinish = IsFinish.No;
    }

    function initToken(address tokenAddr) public onlyOwner {
        token = TokenERC20(tokenAddr);
    }

    function upload(string ipfsAddress) public returns (bool success) {
        if (token.balanceOf(address(this)) >= 10 && isFinish == IsFinish.No) {
            token.transfer(msg.sender, 10); // 合约给sender转代币，存东西送代币
        }else {
            isFinish = IsFinish.Yes;
        }

        if (isFinish == IsFinish.Yes) {
            token.transferFrom(msg.sender, owner, 2);
        }
        /* 需要aprove，如果不加aprove的话，谁都可以来调这个函数花别人的代币了，存东西，花代币，代币转给合约账户
        token.transferFrom(msg.sender, address(this), 10); */ 
        // token.balanceOf(this);
        ipfs[msg.sender].push(ipfsAddress);
        saveIndex += 1;
        Upload(ipfsAddress);
        return true;
    }

/*     function test() public view returns (string name) {
        string str = token.name();
        return str;
    } */

    function download(uint number) external returns (string ipfsAddr) {
        Download(number);
        return ipfs[msg.sender][number];
    }

    function getLength() external view returns (uint length) {
        return ipfs[msg.sender].length;
    }
}