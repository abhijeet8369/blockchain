const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const EXPECTED_CHAIN_ID = 31337;

const CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "string[]",
				"name": "_candidates",
				"type": "string[]"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "candidates",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCandidates",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "",
				"type": "string[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_candidate",
				"type": "string"
			}
		],
		"name": "getVotes",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "hasVoted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_candidate",
				"type": "string"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"name": "votes",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

const connectBtn = document.getElementById("connectBtn");
const refreshBtn = document.getElementById("refreshBtn");
const accountInfo = document.getElementById("accountInfo");
const networkInfo = document.getElementById("networkInfo");
const candidatesContainer = document.getElementById("candidatesContainer");
const statusBox = document.getElementById("statusBox");

let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = "status-box";
  if (type === "error") {
    statusBox.classList.add("status-error");
  } else if (type === "success") {
    statusBox.classList.add("status-success");
  }
}

// MetaMask availability check
function hasMetaMask() {
  return typeof window.ethereum !== "undefined";
}

// Network check 
async function checkNetwork() {
  const network = await provider.getNetwork();
  networkInfo.textContent = `Network: ${network.name || "Unknown"} (Chain ID: ${network.chainId.toString()})`;

  if (EXPECTED_CHAIN_ID !== null && network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
    setStatus(
      `Wrong network! Expected Chain ID ${EXPECTED_CHAIN_ID.toString()}, but currently connected to ${network.chainId.toString()}. Please switch networks in MetaMask.`,
      "error"
    );
    return false;
  }
  return true;
}

// Wallet connect 
async function connectWallet() {
  if (!hasMetaMask()) {
    setStatus("MetaMask not found! Please install or enable the MetaMask extension in your browser.", "error");
    return;
  }

  try {
    setStatus("Connecting to MetaMask...", "info");

    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (!accounts || accounts.length === 0) {
      setStatus("No account was selected.", "error");
      return;
    }

    signer = await provider.getSigner();
    currentAccount = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    accountInfo.textContent = `Account: ${currentAccount}`;
    refreshBtn.disabled = false;

    const isRightNetwork = await checkNetwork();
    if (!isRightNetwork) {
      candidatesContainer.innerHTML = `<p class="info-text">Switch to the correct network and click Refresh Results.</p>`;
      return;
    }

    setStatus("Wallet connected successfully! Loading candidates...", "success");
    await loadCandidatesAndVotes();
  } catch (err) {
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      setStatus("Wallet connection request was rejected by the user.", "error");
    } else {
      setStatus(`Error connecting wallet: ${err.shortMessage || err.message}`, "error");
    }
  }
}

async function loadCandidatesAndVotes() {
  if (!contract || !currentAccount) {
    setStatus("Please connect your MetaMask wallet first.", "error");
    return;
  }

  const isRightNetwork = await checkNetwork();
  if (!isRightNetwork) return;

  try {
    candidatesContainer.innerHTML = `<p class="info-text">Loading data from the blockchain...</p>`;

    // Fetch candidate list and current user's hasVoted status from the contract
    const candidates = await contract.getCandidates();
    const alreadyVoted = await contract.hasVoted(currentAccount);

    if (!candidates || candidates.length === 0) {
      candidatesContainer.innerHTML = `<p class="info-text">No candidates found in the contract.</p>`;
      return;
    }

    candidatesContainer.innerHTML = "";

    for (const candidateName of candidates) {
      const votesCount = await contract.getVotes(candidateName);

      const card = document.createElement("div");
      card.className = "candidate-card";

      const leftDiv = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.className = "candidate-name";
      nameEl.textContent = candidateName;

      const votesEl = document.createElement("div");
      votesEl.className = "candidate-votes";
      votesEl.textContent = `Total Votes: ${votesCount.toString()}`;

      leftDiv.appendChild(nameEl);
      leftDiv.appendChild(votesEl);

      const voteBtn = document.createElement("button");
      voteBtn.textContent = alreadyVoted ? "Already Voted" : "Vote";
      voteBtn.disabled = alreadyVoted;
      voteBtn.addEventListener("click", () => handleVote(candidateName));

      card.appendChild(leftDiv);
      card.appendChild(voteBtn);
      candidatesContainer.appendChild(card);
    }

    if (alreadyVoted) {
      setStatus("Your account has already voted, so the vote buttons are disabled.", "info");
    } else {
      setStatus("Candidates and live vote counts have loaded.", "success");
    }
  } catch (err) {
    candidatesContainer.innerHTML = `<p class="info-text">Failed to load candidates.</p>`;
    setStatus(`Error fetching data: ${err.shortMessage || err.message}`, "error");
  }
}

// Function to submit a vote for a candidate
async function handleVote(candidateName) {
  if (!contract || !currentAccount) {
    setStatus("Please connect your wallet first.", "error");
    return;
  }

  const isRightNetwork = await checkNetwork();
  if (!isRightNetwork) return;

  try {
    // Temporarily disable UI buttons to prevent double clicks
    const allVoteButtons = candidatesContainer.querySelectorAll("button");
    allVoteButtons.forEach((btn) => (btn.disabled = true));

    setStatus(`Sending transaction for "${candidateName}" to MetaMask...`, "info");

    const tx = await contract.vote(candidateName);
    setStatus(`Transaction submitted! Waiting for confirmation...\nTx Hash: ${tx.hash}`, "info");

    await tx.wait();

    setStatus(`Vote confirmed! Your vote for "${candidateName}" has been recorded.`, "success");
    await loadCandidatesAndVotes();
  } catch (err) {
    // Handle user rejection or contract revert/failure
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      setStatus("You rejected the voting transaction in MetaMask.", "error");
    } else if (err.reason) {
      setStatus(`Voting transaction failed: ${err.reason}`, "error");
    } else {
      setStatus(`Voting transaction failed: ${err.shortMessage || err.message}`, "error");
    }

    // Refresh to restore the proper state of buttons after an error
    await loadCandidatesAndVotes();
  }
}

// Event listeners
connectBtn.addEventListener("click", connectWallet);
refreshBtn.addEventListener("click", loadCandidatesAndVotes);

// Auto-update if the user changes account or network in MetaMask
if (hasMetaMask()) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    if (!accounts || accounts.length === 0) {
      currentAccount = null;
      accountInfo.textContent = "Account: Not connected";
      refreshBtn.disabled = true;
      candidatesContainer.innerHTML = `<p class="info-text">Connect your wallet to load candidates from the smart contract.</p>`;
      setStatus("Wallet disconnected.", "info");
    } else if (provider) {
      signer = await provider.getSigner();
      currentAccount = await signer.getAddress();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      accountInfo.textContent = `Account: ${currentAccount}`;
      setStatus(`Account switched: ${currentAccount}`, "info");
      await loadCandidatesAndVotes();
    }
  });

  window.ethereum.on("chainChanged", async () => {
    if (provider && currentAccount) {
      setStatus("Network changed, verifying...", "info");
      const ok = await checkNetwork();
      if (ok) {
        await loadCandidatesAndVotes();
      }
    }
  });
} else {
  setStatus("MetaMask not found! Please install the MetaMask extension.", "error");
}