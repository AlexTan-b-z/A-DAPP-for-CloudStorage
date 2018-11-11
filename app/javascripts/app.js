// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import {
  default as Web3
} from 'web3';
import {
  default as contract
} from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import metacoin_artifacts from '../../build/contracts/TokenERC20.json'
import savecloud_artifacts from '../../build/contracts/SaveCloud.json'

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({
  host: 'localhost',
  port: '5001',
  protocol: 'http'
});

// MetaCoin is our usable abstraction, which we'll use through the code below.
var MetaCoin = contract(metacoin_artifacts);
var SaveCloud = contract(savecloud_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

window.App = {
  start: function () {
    var self = this;

    // Bootstrap the MetaCoin abstraction for Use.
    MetaCoin.setProvider(web3.currentProvider);
    SaveCloud.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function (err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
      
      let local = window.location.href.split('/').pop();
      if ( local == '' || local == 'index.html' ){
        self.refreshBalance();
      } else if( local == 'cloud.html') {
        self.renderFile();
      }
    });
  },

  setStatus: function (message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  approve: function () {

  },

  upload: function () {
    let objFile = document.getElementById("fileId")
    if (objFile.value == "") {
      alert("不能空")
    }
    console.log(objFile.files[0].size); // 文件字节数
    var files = $('#fileId').prop('files'); //获取到文件列表
    if (files.length == 0) {
      alert('请选择文件');
    } else {
      var reader = new FileReader(); //新建一个FileReader
      reader.readAsArrayBuffer(files[0]); //读取文件 
      reader.onloadend = function (e) {
        console.log(reader);
        const buffer = Buffer.from(reader.result);
        ipfs.add(buffer).then((response) => {
          console.log(response)
          let hash = response[0].hash;
          SaveCloud.deployed().then(function (cloud) {
            cloud.upload(hash, { from: account, gas: 440000 }).then(function (isSuccess) {
              console.log(isSuccess);
              if(isSuccess.tx != ""){
                alert("upload success!")
              } else {
                alert("upload failed!")
              }
            });
          })
        }).catch((err) => {
          console.error(err)
        })
      }
    }
  },

  renderFile: function () {
    SaveCloud.deployed().then(function (cloud) {
      cloud.getLength.call({from:account}).then(function (len) {
        let length = len.toString();
        console.log(length);
        $('#number')[0].innerHTML = length;
        for (let i = 0; i < length; i++) {
          let option = '<option value ="' + (i + 1) + '">' + (i + 1) + '</option>'
          $('#select')[0].innerHTML += option; 
        }
      });
    });
  },

  download: function () {
    SaveCloud.deployed().then(function (cloud) {
      let choose = $('#select').val() - 1;
      cloud.download.call(choose, {
        from: account
      }).then(function (ipfsAddress) {
        window.open("https://ipfs.io/ipfs/" + ipfsAddress, "a1");
      });
    });
  },

  refreshBalance: function () {
    var self = this;

    var meta;
    MetaCoin.deployed().then(function (instance) {
      meta = instance;
      return meta.balanceOf.call(account, {
        from: account
      });
    }).then(function (value) {
      var balance_element = document.getElementById("balance");
      balance_element.innerHTML = value.valueOf();
    }).catch(function (e) {
      console.log(e);
      self.setStatus("Error getting balance; see log.");
    });
  },

  sendCoin: function () {
    var self = this;

    var amount = parseInt(document.getElementById("amount").value);
    var receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    MetaCoin.deployed().then(function (instance) {
      meta = instance;
      return meta.transfer(receiver, amount, {
        from: account
      });
    }).then(function () {
      self.setStatus("Transaction complete!");
      self.refreshBalance();
    }).catch(function (e) {
      console.log(e);
      self.setStatus("Error sending coin; see log.");
    });
  }
};

window.addEventListener('load', function () {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});