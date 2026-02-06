"use client";

import { useEffect, useMemo, useState } from "react";
import { getConnectedWalletClient } from "@/lib/web3/wallet";
import { getSupabase } from "@/lib/supabase/server";
import Aurora from "@/components/Aurora";
import { ChainId } from '@lifi/sdk';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CHAIN_CONFIG: Record<string, { chainId: ChainId; viemChain: any; name: string }> = {
  ethereum: { chainId: ChainId.ETH, viemChain: mainnet, name: 'Ethereum' },
  polygon: { chainId: ChainId.POL, viemChain: polygon, name: 'Polygon' },
  arbitrum: { chainId: ChainId.ARB, viemChain: arbitrum, name: 'Arbitrum' },
  optimism: { chainId: ChainId.OPT, viemChain: optimism, name: 'Optimism' },
  base: { chainId: ChainId.BAS, viemChain: base, name: 'Base' },
};

const chainLogoMap: Record<string, string> = {
  ethereum: 'ethereum.png',
  polygon: 'polygon.png',
  arbitrum: 'arbitrum.png',
  optimism: 'optimism.png',
  base: 'base.png',
};

type Recipient = {
  wallet_address: string;
  display_name: string | null;
  created_at: string;
  profile_pic_url?: string | null;
  social_links?: string[] | null;
  preferred_chain?: string | null;
};

export default function StreamerPage() {
  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [profile, setProfile] = useState<Recipient | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [creatorDonations, setCreatorDonations] = useState<{ created_at: string; amount: number }[]>([]);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [previewPicUrl, setPreviewPicUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [preferredChain, setPreferredChain] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabase(), []);

  async function connect() {
    setStatus("");
    const wc = await getConnectedWalletClient();
    setWallet(wc.account!.address);
  }

  function onSocialLinkChange(index: number, value: string) {
    setSocialLinks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, ""]);
  }

  async function register() {
    if (!wallet) throw new Error("Connect wallet");
    setStatus("Creating profile...");

    let uploadedUrl: string | null = profilePicUrl;

    if (profilePicFile) {
      const ext = profilePicFile.name.split(".").pop() || "png";
      const path = `${wallet}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profilepic")
        .upload(path, profilePicFile, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from("profilepic").getPublicUrl(path);
      uploadedUrl = data.publicUrl;
      setProfilePicUrl(uploadedUrl);
    }

    const cleanedLinks = socialLinks.map((link) => link.trim()).filter(Boolean);

    if (!preferredChain) {
      throw new Error("Please select your preferred chain to receive funds");
    }

    const res = await fetch("/api/recipients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        wallet_address: wallet,
        display_name: displayName || null,
        profile_pic_url: uploadedUrl,
        social_links: cleanedLinks.length ? cleanedLinks : null,
        preferred_chain: preferredChain,
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Failed to create profile");
    setStatus("Profile created.");
    await refreshProfile(wallet);
  }

  async function refreshProfile(addr: string) {
    const r = await fetch("/api/recipients");
    const j = await r.json();
    const found =
      (j.recipients as Recipient[]).find(
        (x) => x.wallet_address.toLowerCase() === addr.toLowerCase(),
      ) || null;
    setProfile(found);
    if (found?.profile_pic_url) {
      setProfilePicUrl(found.profile_pic_url);
      setPreviewPicUrl(found.profile_pic_url);
    }
    if (found?.social_links) {
      setSocialLinks(found.social_links);
    }
    if (found?.preferred_chain) {
      setPreferredChain(found.preferred_chain);
    }

    const y = await fetch(`/api/yield-distributions?recipient=${addr}`).then((x) =>
      x.json(),
    );
    setEvents(y.yield_distributions || []);

    const d = await fetch(`/api/creator-donations?recipient=${addr}`).then((x) =>
      x.json(),
    );
    console.log("creator-donations response", d);
    setCreatorDonations(d.donations || []);
  }

  useEffect(() => {
    if (!wallet) return;
    refreshProfile(wallet).catch((e) => setStatus(String(e)));
  }, [wallet]);

  const hasProfile = !!profile;

  const donationsChartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const entry of creatorDonations) {
      const date = new Date(entry.created_at).toISOString().slice(0, 10);
      const amount = Number(entry.amount || 0);
      if (!Number.isFinite(amount)) continue;
      byDate[date] = (byDate[date] || 0) + amount;
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, amount]) => ({ date, amount }));
  }, [creatorDonations]);

  // Entry state: wallet not connected, show only centered connect button
  if (!wallet) {
    return (
      <div className="min-h-screen bg-black overflow-hidden">
        <div className="fixed inset-0 h-full w-full">
          <Aurora
            colorStops={["#475569", "#64748b", "#475569"]}
            amplitude={1.2}
            blend={0.6}
            speed={0.8}
          />
        </div>

        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 text-white">
          <div className="flex flex-col items-center gap-6">
            <button
              className="inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-sm font-semibold text-black shadow-xl shadow-slate-300/40 transition hover:scale-[1.03] hover:bg-slate-100"
              onClick={() => connect().catch((e) => setStatus(String(e)))}
            >
              Connect Wallet
            </button>
            {status ? (
              <div className="rounded-2xl border border-slate-400/40 bg-black/70 px-4 py-2 text-xs text-slate-100 shadow-lg backdrop-blur-md">
                {status}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <div className="fixed inset-0 h-full w-full">
        <Aurora
          colorStops={["#475569", "#64748b", "#475569"]}
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Creator</h1>
            <p className="mt-2 max-w-xl text-sm opacity-80">
              Connect your wallet, create a profile, and view yield distributions you receive
              from donors.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasProfile && (
              <button
                onClick={() => setShowProfilePanel((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-black/70 shadow-md"
              >
                {profilePicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePicUrl}
                    alt={profile?.display_name || "Creator avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold">
                    {(profile?.display_name || "CR").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            )}
            <button
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-lg shadow-lg border border-white/20 hover:bg-white/20 transition"
              onClick={() => connect().catch((e) => setStatus(String(e)))}
            >
              {wallet
                ? `Connected: ${wallet.slice(0, 6)}…${wallet.slice(-4)}`
                : "Connect Wallet"}
          </button>
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded-2xl border border-slate-400/40 bg-black/70 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur-md">
            {status}
          </div>
        ) : null}

        {/* Profile full-page view when avatar is clicked */}
        {hasProfile && showProfilePanel ? (
          <section className="mt-10 rounded-3xl border border-white/15 bg-black/70 p-6 shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Creator profile</h2>
              <button
                className="rounded-full border border-white/20 bg-black/60 px-4 py-1 text-xs text-slate-100 hover:bg-black/80"
                onClick={() => setIsEditingProfile((v) => !v)}
              >
                {isEditingProfile ? "Cancel edit" : "Edit profile"}
              </button>
            </div>

            {isEditingProfile ? (
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Display name
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-sm outline-none placeholder:text-slate-500"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Profile picture
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-black/80">
                        Upload image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProfilePicFile(file);
                              const url = URL.createObjectURL(file);
                              setPreviewPicUrl(url);
                            }
                          }}
                        />
                      </label>
                      {profilePicFile && (
                        <span className="max-w-[180px] truncate text-xs text-slate-300">
                          {profilePicFile.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Social links
                    </label>
                    <div className="mt-2 space-y-2">
                      {socialLinks.map((link, idx) => (
                        <input
                          key={idx}
                          className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-xs outline-none placeholder:text-slate-500"
                          placeholder="https://"
                          value={link}
                          onChange={(e) => onSocialLinkChange(idx, e.target.value)}
                        />
                      ))}
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-slate-200 hover:text-white"
                        onClick={addSocialLink}
                      >
                        + Add link
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Preferred Chain
                    </label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(CHAIN_CONFIG).map(([key, config]) => {
                        const isSelected = preferredChain === key;
                        const logoPath = `/chain-logo/${chainLogoMap[key] || 'circle.png'}`;
                        
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setPreferredChain(key)}
                            className={`rounded-xl border px-3 py-2 text-left transition ${
                              isSelected
                                ? "border-white/60 bg-white/10"
                                : "border-white/10 bg-black/40 hover:border-white/30"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={logoPath}
                                alt={config.name}
                                className="h-4 w-4 rounded-full object-cover"
                              />
                              <div className="text-[10px] font-semibold text-slate-50">{config.name}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-black/80 px-4 py-4 text-xs text-slate-300">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Preview
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-black/70">
                        {previewPicUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewPicUrl}
                            alt={displayName || "Creator avatar preview"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {(displayName || "CR").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-50">
                          {displayName || profile?.display_name || "Your creator name"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.03] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!wallet || !preferredChain}
                    onClick={() => register().catch((e) => setStatus(String(e)))}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex flex-col items-center gap-3 md:items-start">
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-black/80">
                    {profilePicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profilePicUrl}
                        alt={profile.display_name || "Creator avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold">
                        {(profile.display_name || "CR").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{profile.wallet_address}</div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {profile.display_name || "Creator"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-300">
                      Public profile as seen by donors.
                    </p>
                  </div>

                  {profile.preferred_chain && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Preferred Chain:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <img
                          src={`/chain-logo/${chainLogoMap[profile.preferred_chain] || 'circle.png'}`}
                          alt={CHAIN_CONFIG[profile.preferred_chain]?.name || profile.preferred_chain}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-200">
                          {CHAIN_CONFIG[profile.preferred_chain]?.name || profile.preferred_chain}
                        </span>
                      </div>
                    </div>
                  )}

                  {profile.social_links && profile.social_links.length > 0 && (
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Social links
                      </div>
                      {profile.social_links.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-slate-200 hover:text-white"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* If no profile, show creation form */}
            {!hasProfile && wallet && (
          <section className="mt-10 rounded-3xl border border-white/15 bg-black/70 p-5 shadow-xl backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-slate-50">Create your creator profile</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              This is how donors will discover and support you.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Display name
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-sm outline-none placeholder:text-slate-500"
                    placeholder="e.g. Sam Felix"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Profile picture
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-black/80">
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProfilePicFile(file);
                            const url = URL.createObjectURL(file);
                            setPreviewPicUrl(url);
                          }
                        }}
                      />
                    </label>
                    {profilePicFile && (
                      <span className="text-xs text-slate-300 truncate max-w-[180px]">
                        {profilePicFile.name}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Social links
                  </label>
                  <div className="mt-2 space-y-2">
                    {socialLinks.map((link, idx) => (
                      <input
                        key={idx}
                        className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-xs outline-none placeholder:text-slate-500"
                        placeholder="https://"
                        value={link}
                        onChange={(e) => onSocialLinkChange(idx, e.target.value)}
                      />
                    ))}
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-slate-200 hover:text-white"
                      onClick={addSocialLink}
                    >
                      + Add link
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Preferred Chain <span className="text-red-400">*</span>
                  </label>
                  <p className="mt-1 text-[10px] text-slate-400 mb-2">
                    Choose the chain where you'd like to receive funds
                  </p>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(CHAIN_CONFIG).map(([key, config]) => {
                      const isSelected = preferredChain === key;
                      const logoPath = `/chain-logo/${chainLogoMap[key] || 'circle.png'}`;
                      
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPreferredChain(key)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            isSelected
                              ? "border-white/60 bg-white/10"
                              : "border-white/10 bg-black/40 hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={logoPath}
                              alt={config.name}
                              className="h-4 w-4 rounded-full object-cover"
                            />
                            <div className="text-[10px] font-semibold text-slate-50">{config.name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-black/70 px-4 py-4 text-xs text-slate-300">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Preview
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-black/70">
                      {previewPicUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewPicUrl}
                          alt={displayName || "Creator avatar preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold">
                          {(displayName || "CR").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-50">
                        {displayName || "Your creator name"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.03] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!wallet || !preferredChain}
                  onClick={() => register().catch((e) => setStatus(String(e)))}
                >
                  Create profile
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Yield view when profile exists */}
        {hasProfile && (
          <section className="mt-10 rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">
                  Donations received
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-300">
                  All Donations that have been made to this creator.
                </p>
              </div>
              <div className="rounded-full border border-slate-300/40 bg-black/40 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-100">
                {events.length} <span className="uppercase">events</span>
              </div>
            </div>

            {/* Graph on top, list below */}
            <div className="mt-6 space-y-6">
              <div className="h-72 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-xs text-slate-300">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Donations over time
                </div>
                {donationsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={donationsChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#cbd5f5" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#cbd5f5" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          borderRadius: 12,
                          border: "1px solid rgba(148, 163, 184, 0.4)",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#e5e7eb" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#e5e7eb"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 1, stroke: "#0f172a", fill: "#e5e7eb" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No donations yet to plot.
                  </div>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Yield generated
                </div>
          {events.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-3xl border border-white/10 bg-black/80 p-5 text-xs sm:text-sm"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="text-sm font-semibold text-slate-50">
                        {e.amount} USDC
                      </div>
                      <div className="rounded-full border border-slate-500/50 bg-black/60 px-3 py-1 text-[11px] text-slate-200">
                        {new Date(e.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/70 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          From donor
                        </div>
                        <div className="mt-1 break-all text-[11px] text-slate-200">
                          {e.donor_wallet_address}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/70 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Transfer tx
                        </div>
                        <div className="mt-1 break-all text-[11px] text-slate-200">
                          <a
                            href={`https://basescan.org/tx/${e.transfer_tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-300 hover:text-white hover:underline"
                          >
                            {e.transfer_tx_hash}
                          </a>
                        </div>
                      </div>
                    </div>
            </div>
          ))}
                {events.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/20 bg-black/70 px-4 py-6 text-center text-sm text-slate-300">
                    No yield distributions yet.
                  </div>
                ) : null}
              </div>
        </div>
      </section>
        )}
          </>
        )}
      </main>
    </div>
  );
}

