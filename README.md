# 以太访+IPFS实现一个简单的云存储系统（存储就送币）

*作者: AlexTan* 
*CSDN:   <http://blog.csdn.net/alextan_>*
_Github: <https://github.com/AlexTan-b-z>_
_e-mail: alextanbz@gmail.com_



## 前言

不好意思，各位，现在才发代码。

[原文博客](https://blog.csdn.net/AlexTan_/article/details/79895834)



## 一、介绍：

上一篇博文"以太坊+IPFS+WEB 电商平台开发讲解"介绍了用以太访+IPFS实现电商平台的思路、合约接口的实现以及一些相关的基本概念。这篇博文将讲解具体的一个简单的实战项目，及用以太访+IPFS实现的一个云存储，并用ERC20标准实现了自己的代币，以太访加IPFS实现存储就送代币。 



- 本系统用IPFS来充当存储介质，及用户所上传的东西都是存在IPFS上的，IPFS会返回一个地址（什么是地址？简单理解，你可以通过地址来找到你所存储文件的内容）。

- 用合约来存储用户以及每个用户所存储的IPFS地址

- 用合约实现一个ERC20标准的代币。代币名字叫CloudB，即云币，总发行量10000000。

- 起初每存一次文件便会赠送10个云币，但会花费少量的gas费。

- 待10000000个云币赠送完后，每存储一个文件会花费2个云币以及少量的gas费。

- 查看文件不会产生任何费用。

  ​

## 二、什么是ERC20标准的代币：

ERC20是以太坊定义的一个[代币标准](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md)。要求我们在实现代币的时候必须要遵守的协议，如指定代币名称、总量、实现代币交易函数等，只有支持了协议才能被以太坊钱包支持。其接口如下：

```javascript
contract ERC20Interface {



    string public constant name = "Token Name";

    string public constant symbol = "SYM";

    uint8 public constant decimals = 18;  // 18 is the most common number of decimal places



    function totalSupply() public constant returns (uint);

    function balanceOf(address tokenOwner) public constant returns (uint balance);

    function allowance(address tokenOwner, address spender) public constant returns (uint remaining);

    function transfer(address to, uint tokens) public returns (bool success);

    function approve(address spender, uint tokens) public returns (bool success);

    function transferFrom(address from, address to, uint tokens) public returns (bool success);



    event Transfer(address indexed from, address indexed to, uint tokens);

    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);

}

```

简单说明一下：

- name ： 代币名称；

- symbol： 代币符号；

- decimals： 代币小数点位数，代币的最小单位， 18表示我们可以拥有 .0000000000000000001单位个代币；

- totalSupply() : 发行代币总量；

- balanceOf(): 查看对应账号的代币余额；

- transfer(): 实现代币交易，用于给用户发送代币（从我们的账户里）；

- transferFrom(): 实现代币用户之间的交易；

- allowance(): 控制代币的交易，如可交易账号及资产；

- approve(): 允许用户可花费的代币数；

  ​



**代币合约代码（TokenERC20.sol）：**

```javascript
pragma solidity ^0.4.16;

interface tokenRecipient { function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) public; }

contract TokenERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;  // decimals 可以有的小数点个数，最小的代币单位。18 是建议的默认值
    uint256 public totalSupply;

    // 用mapping保存每个地址对应的余额
    mapping (address => uint256) public balanceOf;
    // 存储对账号的控制
    mapping (address => mapping (address => uint256)) public allowance;

    // 事件，用来通知客户端交易发生
    event Transfer(address indexed from, address indexed to, uint256 value);

    // 事件，用来通知客户端代币被消费
    event Burn(address indexed from, uint256 value);

    /**
        * 初始化构造
        */
    function TokenERC20(uint256 initialSupply, string tokenName, string tokenSymbol, address rootWallet) public {
        totalSupply = initialSupply * 10 ** uint256(decimals);  // 供应的份额，份额跟最小的代币单位有关，份额 = 币数 * 10 ** decimals。
        balanceOf[rootWallet] = totalSupply;                // 指定账户地址拥有所有的代币
        name = tokenName;                                   // 代币名称
        symbol = tokenSymbol;                               // 代币符号
    }

    /**
        * 代币交易转移的内部实现
        */
    function _transfer(address _from, address _to, uint _value) internal {
        // 确保目标地址不为0x0，因为0x0地址代表销毁
        require(_to != 0x0);
        // 检查发送者余额
        require(balanceOf[_from] >= _value);
        // 确保转移为正数个
        require(balanceOf[_to] + _value > balanceOf[_to]);

        // 以下用来检查交易，
        uint previousBalances = balanceOf[_from] + balanceOf[_to];
        // Subtract from the sender
        balanceOf[_from] -= _value;
        // Add the same to the recipient
        balanceOf[_to] += _value;
        Transfer(_from, _to, _value);

        // 用assert来检查代码逻辑。
        assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
    }

    /**
        *  代币交易转移
        * 从自己（创建交易者）账号发送`_value`个代币到 `_to`账号
        *
        * @param _to 接收者地址
        * @param _value 转移数额
        */
    function transfer(address _to, uint256 _value) public {
        _transfer(msg.sender, _to, _value);
    }

    /**
        * 账号之间代币交易转移
        * @param _from 发送者地址
        * @param _to 接收者地址
        * @param _value 转移数额
        */
    function transferFrom(address _from, address _to, uint256 _value) public payable returns (bool success) {
        require(_value <= allowance[_from][msg.sender]);     // Check allowance
        allowance[_from][msg.sender] -= _value;
        _transfer(_from, _to, _value);
        return true;
    }

    /**
        * 设置某个地址（合约）可以创建交易者名义花费的代币数。
        *
        * 允许发送者`_spender` 花费不多于 `_value` 个代币
        *
        * @param _spender The address authorized to spend
        * @param _value the max amount they can spend
        */
    function approve(address _spender, uint256 _value) public
        returns (bool success) {
            allowance[msg.sender][_spender] = _value;
            return true;
        }

    /**
        * 设置允许一个地址（合约）以我（创建交易者）的名义可最多花费的代币数。
        *
        * @param _spender 被授权的地址（合约）
        * @param _value 最大可花费代币数
        * @param _extraData 发送给合约的附加数据
        */
    function approveAndCall(address _spender, uint256 _value, bytes _extraData)
        public
        returns (bool success) {
        tokenRecipient spender = tokenRecipient(_spender);
        if (approve(_spender, _value)) {
            // 通知合约
            spender.receiveApproval(msg.sender, _value, this, _extraData);
            return true;
        }
    }

    /**
        * 销毁我（创建交易者）账户中指定个代币
        */
    function burn(uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);   // Check if the sender has enough
        balanceOf[msg.sender] -= _value;            // Subtract from the sender
        totalSupply -= _value;                      // Updates totalSupply
        Burn(msg.sender, _value);
        return true;
    }

    /**
        * 销毁用户账户中指定个代币
        *
        * Remove `_value` tokens from the system irreversibly on behalf of `_from`.
        *
        * @param _from the address of the sender
        * @param _value the amount of money to burn
        */
    function burnFrom(address _from, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value);                // Check if the targeted balance is enough
        require(_value <= allowance[_from][msg.sender]);    // Check allowance
        balanceOf[_from] -= _value;                         // Subtract from the targeted balance
        allowance[_from][msg.sender] -= _value;             // Subtract from the sender's allowance
        totalSupply -= _value;                              // Update totalSupply
        Burn(_from, _value);
        return true;
    }
}
```

## 三、存储合约代码实现

存储合约里实现了，upload上传（实现了赠送代币以及花费代币）、download下载、获取用户所存储文件的个数等函数。具体代码如下：



**SaveCloud.sol:**

``` javascript
pragma solidity ^0.4.16;
import "./TokenERC20.sol";


contract SaveCloud {
    enum IsFinish {Yes, No}

    IsFinish isFinish; // 用于判断代币是否已经赠送完
    address private owner; // 合约的创建者
    uint public saveIndex; // 合约存储文件的总数量
    mapping (address=>string[]) public ipfs; // 用于存放每个用户所存储到ipfs的ipfs地址 address => 用户地址，string[] => ipfs地址
    TokenERC20 public token; // 代币合约的实例化对象
    
    event Upload(string ipfsAddress );
    event Download(uint number);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function SaveCloud() public {
    /* 构造函数，部署合约时便会调用这个函数 */
        owner = msg.sender;
        saveIndex = 0;
        isFinish = IsFinish.No;
    }

    function initToken(address tokenAddr) public onlyOwner { 
        /* 实例化代币合约对象，只有创建合约者才能调用此函数 */
        token = TokenERC20(tokenAddr);
    }

    function upload(string ipfsAddress) public payable returns (bool success) {
        if (token.balanceOf(address(this)) >= 10 && isFinish == IsFinish.No) {
            token.transfer(msg.sender, 10); // 合约给sender转代币，存东西送代币
        }else {
            isFinish = IsFinish.Yes;
        }

        if (isFinish == IsFinish.Yes) {
            token.transferFrom(msg.sender, owner, 2);
            // 需要aprove（授权），如果不加aprove的话，谁都可以来调这个函数花别人的代币了，存东西，花代币，代币转给合约账户
        }
        ipfs[msg.sender].push(ipfsAddress);
        saveIndex += 1;
        Upload(ipfsAddress);
        return true;
    }

    function download(uint number) external returns (string ipfsAddr) {
        /* 获取用户的所存放文件的位置（ipfs地址） */
        Download(number);
        return ipfs[msg.sender][number];
    }

    function getLength() external view returns (uint length) {
        /* 获取用户所存放文件的个数 */
        return ipfs[msg.sender].length;
    }
}
```

## 三、部署代码：

笔者使用的是truffle框架，其本地部署代码如下：



**2_deploy_contracts.js:**

``` javascript
var TokenERC20 = artifacts.require("./TokenERC20.sol");
var SaveCloud = artifacts.require("./SaveCloud.sol");

module.exports = function(deployer) {
  deployer.deploy(SaveCloud).then(function() {
    /* 实例化SaveCloud合约后实例化代币合约 */
    return deployer.deploy(TokenERC20, 10000000, "cloudb", "CloudB", SaveCloud.address);
  })
};
```



## 四、js调用代码：

js调用代码、以及前端页面代码，代码已发github，还请大家自行查看。