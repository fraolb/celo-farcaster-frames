import { useState, useEffect } from "react";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import {
  useSendTransaction,
  useAccount,
  useBalance,
  useConnect,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { celo } from "wagmi/chains";
import { parseEther } from "viem";

// Initialize Neynar client
const neynarConfig = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY ?? "",
});
const neynarClient = new NeynarAPIClient(neynarConfig);

export default function TokenSender() {
  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { connect, connectors } = useConnect();
  const { data: balance } = useBalance({
    address: useAccount().address,
    chainId: celo.id,
  });
  const {
    sendTransaction,
    data: hash,
    isPending: isSending,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>("");

  // Search users with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        const q = searchQuery;
        const limit = 10;
        try {
          const result = await neynarClient.searchUser({ q, limit });
          setSearchResults(result.result.users);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSend = async () => {
    setError("");
    if (!isConnected) return setError("Please connect your wallet first");
    if (!selectedUser?.verified_addresses?.eth_addresses?.[0])
      return setError("User has no verified Ethereum address");
    if (!amount || parseFloat(amount) <= 0)
      return setError("Please enter a valid amount");

    try {
      // Check if already on Celo
      if (chain?.id !== celo.id) {
        await switchChain({ chainId: celo.id });
      }

      // Check balance
      if (balance && parseFloat(balance.formatted) < parseFloat(amount)) {
        throw new Error("Insufficient balance");
      }

      await sendTransaction({
        to: selectedUser.verified_addresses.eth_addresses[0] as `0x${string}`,
        value: parseEther(amount),
      });
    } catch (error: any) {
      console.error("Send error:", error);
      setError(error.message || "Transaction failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Send Celo on Farcaster
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Search for users and send them Celo tokens
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div style={{ width: "100%", marginBottom: "2rem" }}>
          {!isConnected ? (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "#cbd5e1",
                  marginBottom: "1.5rem",
                  fontSize: "1.3rem",
                }}
              >
                Connect your wallet
              </p>
              <button
                className="font-vt323 w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl mb-2
             transition-all duration-200 ease-in-out
             hover:border-2 hover:border-white hover:-translate-y-0.5 hover:shadow-lg
             active:scale-95 active:bg-white/10 active:border-2 active:border-white/80
             relative overflow-hidden"
                onClick={() => connect({ connector: connectors[0] })}
              >
                CONNECT WALLET
              </button>
            </div>
          ) : chain?.id !== celo.id ? (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "#cbd5e1",
                  marginBottom: "1.5rem",
                  fontSize: "1.3rem",
                }}
              >
                Switch to Celo network
              </p>
              <button
                type="button"
                className="font-vt323 w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl mb-2
             transition-all duration-200 ease-in-out
             hover:border-2 hover:border-white hover:-translate-y-0.5 hover:shadow-lg
             active:scale-95 active:bg-white/10 active:border-2 active:border-white/80
             relative overflow-hidden"
                onClick={() => switchChain({ chainId: celo.id })}
              >
                SWITCH TO CELO
              </button>
            </div>
          ) : null}
        </div>

        {isConnected && chain?.id === celo.id && (
          <>
            <div className="mb-6">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search Farcaster Users
              </label>
              <input
                type="text"
                id="search"
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <p className="mt-1 text-sm text-gray-500">Searching...</p>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.fid}
                      className={`flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                        selectedUser?.fid === user.fid
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <img
                        src={user.pfp_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-full mr-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/default-pfp.png";
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          @{user.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user.display_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="mb-6">
                <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-md">
                  <img
                    src={selectedUser.pfp_url}
                    alt={selectedUser.username}
                    className="w-12 h-12 rounded-full mr-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-pfp.png";
                    }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      @{selectedUser.username}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedUser.display_name}
                    </p>
                    {selectedUser.verified_addresses?.eth_addresses?.[0] && (
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedUser.verified_addresses.eth_addresses[0]}
                      </p>
                    )}
                  </div>
                </div>

                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Amount (CELO)
                </label>
                <input
                  type="number"
                  id="amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {balance && (
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: {parseFloat(balance.formatted).toFixed(4)} CELO
                  </p>
                )}
              </div>
            )}

            {selectedUser && amount && (
              <button
                onClick={handleSend}
                disabled={isSending || isConfirming}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSending || isConfirming
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                }`}
              >
                {isSending
                  ? "Waiting for approval..."
                  : isConfirming
                  ? "Processing transaction..."
                  : `Send ${amount} CELO`}
              </button>
            )}

            {isConfirmed && hash && (
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-700">
                  Transaction confirmed!{" "}
                  <a
                    href={`https://explorer.celo.org/mainnet/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 underline"
                  >
                    View on Celo Explorer
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
