const { ethers } = require('ethers');
(async () => {
  try {
    const p = new ethers.JsonRpcProvider('https://api-mezame.shardeum.org');
    const d = await p.getFeeData();
    console.log('gasPrice:', d.gasPrice);
    console.log('maxFeePerGas:', d.maxFeePerGas);
    console.log('maxPriorityFeePerGas:', d.maxPriorityFeePerGas);
  } catch(e) {
    console.error(e);
  }
})();
