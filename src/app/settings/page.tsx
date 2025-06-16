"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { models } from "@/data/models";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { exportAllChats, exportSingleChat, resetAllData } from "@/lib/export";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Model, ModelFeatures } from "@/data/models";
import { useAllModels } from "@/hooks/use-models";
import { Input } from "@/components/ui/input";
import { Button as UiButton } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { useSync } from "@/contexts/SyncContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const providerDisplayNames: { [key: string]: string } = {
  google: "Google",
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

// Extract unique providers from models for the API key tab
const apiKeyProviders = Array.from(
  new Map(
    models.map((model) => [model.provider, {
      id: model.provider,
      name: providerDisplayNames[model.provider] || model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
      logo: model.providerLogo,
      placeholder: `Enter your ${providerDisplayNames[model.provider] || model.provider.charAt(0).toUpperCase() + model.provider.slice(1)} API Key`,
    }])
  ).values()
);
apiKeyProviders.push({
  id: "elevenlabs",
  name: "ElevenLabs",
  logo: "elevenlabs.svg",
  placeholder: "Enter your ElevenLabs API Key",
});

const ttsVoices = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  { id: "ErXwobaYiN019P7PKGsd", name: "Antoni" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Eli" },
];

// Helper component for the "OpenRouter Models" tab
function OpenRouterModelsTab() {
  const { ydoc } = useSync();
  const customModels = useLiveQuery(() => db.customModels.where('provider').equals('openrouter').toArray(), []);
  const [newModel, setNewModel] = useState<Partial<Model>>({
    provider: 'openrouter',
    providerLogo: 'openrouterai.png',
    features: {
      vision: false, image_gen: false, audio_gen: false, video_gen: false,
      web_search: false, pdf: false, fast: false, reasoning: false
    }
  });

  const handleInputChange = (field: keyof Model, value: any) => {
    setNewModel(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (feature: keyof ModelFeatures, value: boolean) => {
    setNewModel(prev => {
      const currentFeatures = prev.features || {
        vision: false, image_gen: false, audio_gen: false, video_gen: false,
        web_search: false, pdf: false, fast: false, reasoning: false
      };
      return {
        ...prev,
        features: {
          ...currentFeatures,
          [feature]: value
        }
      };
    });
  };

  const handleAddModel = async () => {
    if (!newModel.id || !newModel.name) {
      toast.error("Model ID and Name are required.");
      return;
    }
    const modelToSave = { ...newModel, features: newModel.features || {} };
    ydoc.getMap('models').set(newModel.id, modelToSave as Model);
    toast.success("Custom model added successfully!");
    setNewModel({
      provider: 'openrouter',
      providerLogo: 'openrouterai.png',
      features: {
        vision: false, image_gen: false, audio_gen: false, video_gen: false,
        web_search: false, pdf: false, fast: false, reasoning: false
      }
    });
  };

  const handleDeleteModel = async (id: string) => {
    ydoc.getMap('models').delete(id);
    toast.success("Custom model deleted.");
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-2">OpenRouter Models</h2>
      <p className="text-muted-foreground mb-6">
        Add any model from the OpenRouter library. Find available models and their IDs on the{' '}
        <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          OpenRouter models page
        </a>.
      </p>
      
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Add New Model</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Model ID (e.g., `anthropic/claude-3-haiku`)</Label>
                <Input
                  value={newModel.id || ''}
                  onChange={e => handleInputChange('id', e.target.value)}
                  placeholder="Provider/ModelName"
                />
              </div>
              <div>
                <Label className="mb-2 block">Display Name (e.g., `Claude 3 Haiku`)</Label>
                <Input
                  value={newModel.name || ''}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="A user-friendly name"
                />
              </div>
               <div>
                <Label className="mb-2 block">Provider</Label>
                <Input
                  value={newModel.provider || 'openrouter'}
                  disabled 
                />
              </div>
              <div>
                <Label className="mb-2 block">Features</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(newModel.features || {}).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        id={key}
                        checked={newModel.features?.[key as keyof ModelFeatures]}
                        onCheckedChange={checked => handleFeatureChange(key as keyof ModelFeatures, checked)}
                      />
                      <Label htmlFor={key} className="capitalize">{key.replace('_', ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <UiButton onClick={handleAddModel} className="w-full">Add Model</UiButton>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Your OpenRouter Models</h3>
            <div className="bg-muted/50 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customModels?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No OpenRouter models added yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {customModels?.map(model => (
                    <TableRow key={model.id}>
                      <TableCell>{model.name}</TableCell>
                      <TableCell className="font-mono">{model.id}</TableCell>
                      <TableCell className="text-right">
                        <UiButton variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </UiButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncTab() {
  const { startPairing, connectToPairingCode, pairingCode, isConnected, disconnect, peers, startNewSession, isRestoring } = useSync();
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState("");
  const [manualCode, setManualCode] = useState("");

  const connectToPairingCodeRef = useRef(connectToPairingCode);
  useEffect(() => {
    connectToPairingCodeRef.current = connectToPairingCode;
  }, [connectToPairingCode]);

  useEffect(() => {
    if (!isScanning) return;
    console.log("SyncTab: Starting QR scanner.");

    // Use a ref to ensure scanner is created only once per scan attempt
    const scannerRef = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      /* verbose= */ false
    );

    const onScanSuccess = (decodedText: string) => {
      console.log("SyncTab: QR code scan successful.", { decodedText });
      scannerRef.clear().catch(err => console.error("Error clearing scanner", err));
      setIsScanning(false);
      setIsConnecting(true);
      connectToPairingCodeRef.current(decodedText);
      toast.info("QR Code scanned, attempting to connect...");
    };

    scannerRef.render(onScanSuccess, undefined);

    return () => {
      console.log("SyncTab: Cleaning up QR scanner.");
       scannerRef.clear().catch(err => {});
    };
  }, [isScanning]);

  // Timeout for connection
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnecting && !isConnected) {
      console.log("SyncTab: Starting connection timeout (15s).");
      timer = setTimeout(() => {
        if (!isConnected) {
          console.log("SyncTab: Connection timed out.");
          setIsConnecting(false);
          toast.error("Failed to connect to device. Connection timed out.", {
            description: "Please check your network and try generating a new code.",
          });
        }
      }, 15000); // 15-second timeout
    }
    return () => clearTimeout(timer);
  }, [isConnecting, isConnected]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (isConnected) {
      console.log("SyncTab: isConnected is true, clearing connecting state and starting status sequence.");
      setIsConnecting(false);
      
      setSyncStatusMessage("Connecting...");
      timers.push(setTimeout(() => setSyncStatusMessage("Devices connected, transferring data..."), 1500));
      timers.push(setTimeout(() => setSyncStatusMessage("Creating real-time sync..."), 3000));
      timers.push(setTimeout(() => {
          setSyncStatusMessage(""); // This will hide the status screen
      }, 4500));
    }
    return () => timers.forEach(clearTimeout);
  }, [isConnected]);
  
  const handleManualConnect = () => {
    console.log("SyncTab: handleManualConnect called.", { manualCode });
    if (manualCode.trim()) {
      setIsConnecting(true);
      connectToPairingCode(manualCode.trim());
    } else {
      toast.error("Please enter a pairing code.");
    }
  };

  if (isRestoring && !isConnected) {
    return (
        <div className="flex-1 p-6 overflow-y-auto text-center flex flex-col justify-center items-center">
            <h2 className="text-2xl font-bold mb-2">Restoring session...</h2>
            <p className="text-muted-foreground mb-6">Attempting to reconnect to your previous sync session.</p>
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-6"></div>
            <style>{`.loader { border-top-color: #3b82f6; animation: spinner 1.5s linear infinite; } @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
  }

  if (isConnected && !syncStatusMessage) {
    const peerList = Array.from(peers.values()).filter(p => !p.isSelf);
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-2">Sync Active</h2>
            <p className="text-muted-foreground mb-6">Your devices are connected and syncing in real-time.</p>
            
            {peers.size > 1 && (
                <div className="bg-muted/50 rounded-lg border p-4 mb-6">
                    <h3 className="text-lg font-semibold mb-3">Connected Devices</h3>
                    <ul className="space-y-2 text-left">
                        {Array.from(peers.values()).map(peer => (
                             <li key={peer.name} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <span>{peer.name} {peer.isSelf && <span className="text-xs text-muted-foreground">(This device)</span>}</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                 <UiButton onClick={startNewSession} variant="outline">Start New Session</UiButton>
                 <UiButton onClick={disconnect} variant="destructive">Disconnect All</UiButton>
            </div>
             <p className="text-xs text-muted-foreground mt-4">
                "Start New Session" will create a new pairing code, disconnecting all current devices.
            </p>
        </div>
      </div>
    );
  }

  if (isConnecting || syncStatusMessage) {
    const title = syncStatusMessage || "Connecting...";
    let description = "Attempting to establish a connection with the other device.";
    if (syncStatusMessage.startsWith("Devices connected")) {
        description = "Exchanging information to sync your data.";
    } else if (syncStatusMessage.startsWith("Creating")) {
        description = "Finalizing the peer-to-peer connection.";
    }

    return (
      <div className="flex-1 p-6 overflow-y-auto text-center flex flex-col justify-center items-center">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-6"></div>
        <style>{`.loader { border-top-color: #3b82f6; animation: spinner 1.5s linear infinite; } @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        {isConnecting && <UiButton variant="outline" onClick={() => setIsConnecting(false)}>Cancel</UiButton>}
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-2">Sync & Devices</h2>
      <p className="text-muted-foreground mb-6">
        Sync your conversation history across devices peer-to-peer without a central server.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Host a session */}
        <div className="bg-card rounded-xl p-6 border">
          <h3 className="text-lg font-semibold mb-4">Host a Sync Session</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Generate a code on this device. Scan it or enter it on another device to sync.
          </p>
          {pairingCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeCanvas value={pairingCode} size={192} />
              </div>
              <p className="font-mono text-lg tracking-wider p-2 bg-muted rounded">{pairingCode}</p>
              <p className="text-muted-foreground text-xs text-center">Waiting for another device to connect...</p>
              <UiButton onClick={startPairing} variant="outline" className="w-full">Generate New Code</UiButton>
            </div>
          ) : (
            <UiButton onClick={startPairing} className="w-full">Generate Pairing Code</UiButton>
          )}
        </div>

        {/* Join a session */}
        <div className="bg-card rounded-xl p-6 border flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Join a Sync Session</h3>
          
          <div className="flex-1 flex flex-col justify-center">
            {isScanning ? (
              <div>
                <div id="qr-reader" style={{ width: "100%" }}></div>
                <UiButton variant="outline" onClick={() => setIsScanning(false)} className="w-full mt-4">Cancel</UiButton>
              </div>
            ) : (
              <div className="space-y-4">
                 <UiButton onClick={() => setIsScanning(true)} className="w-full">Scan Pairing Code</UiButton>
                 <div className="flex items-center gap-2">
                    <hr className="flex-grow" />
                    <span className="text-muted-foreground text-sm">OR</span>
                    <hr className="flex-grow" />
                 </div>
                 <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter pairing code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                    />
                    <UiButton onClick={handleManualConnect}>Connect</UiButton>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full mt-8">
        <AccordionItem value="how-it-works">
          <AccordionTrigger>How does this work?</AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
              <p>To sync between devices across any network, you need to securely expose your local signaling server to the internet. We recommend using <a href="https://ngrok.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">ngrok</a> for this.</p>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  <strong>Start the local signaling server.</strong>
                  <p className="mt-1">In a terminal, run the following command in the project's root directory:</p>
                  <pre className="bg-muted p-2 rounded-lg text-foreground mt-2"><code>npx y-webrtc-signaling --host 0.0.0.0 --port 4444</code></pre>
                </li>
                <li>
                  <strong>Expose your server with ngrok.</strong>
                  <p className="mt-1">If you don't have ngrok, <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer" className="text-primary underline">download and install it</a>. In a <strong>new</strong> terminal window, run:</p>
                  <pre className="bg-muted p-2 rounded-lg text-foreground mt-2"><code>ngrok http 4444</code></pre>
                </li>
                <li>
                  <strong>Configure the app with your ngrok URL.</strong>
                  <p className="mt-1">
                    Ngrok will provide a public "Forwarding" URL (e.g., <code>https://random-string.ngrok-free.app</code>). You need to use this to create a secure WebSocket URL.
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Create a file named <code>.env.local</code> in the root of your project (if it doesn't exist).</li>
                    <li>Add the following line, replacing the URL with your ngrok URL. <strong>Make sure to use <code>wss://</code></strong>.</li>
                  </ul>
                  <pre className="bg-muted p-2 rounded-lg text-foreground mt-2"><code>NEXT_PUBLIC_SIGNALING_URL=wss://random-string.ngrok-free.app</code></pre>
                   <p className="mt-2">
                    <strong>Important:</strong> You must restart your Next.js development server (<code>npm run dev</code>) after creating or changing the <code>.env.local</code> file.
                  </p>
                </li>
                <li>
                  <strong>Connect your devices.</strong>
                   <p className="mt-1">You can now open the app on any device, anywhere in the world. Use the pairing code or QR scanner to connect them. The connection will be relayed securely through your ngrok tunnel.</p>
                </li>
              </ol>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'customization' | 'models' | 'apikeys' | 'openroutermodels' | 'export' | 'experimental' | 'sync'>('customization');
  const allChats = useLiveQuery(() => db.chats.toArray(), []);
  const allModels = useAllModels();
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [exportSearchQuery, setExportSearchQuery] = useState('');

  // Customization state
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [aiTraits, setAiTraits] = useState<string[]>([]);
  const [currentTrait, setCurrentTrait] = useState('');
  const [userInterests, setUserInterests] = useState('');
  const { ydoc } = useSync();

  const customizationData = useLiveQuery(() => db.customisation.get('userProfile'));

  useEffect(() => {
    if (customizationData) {
      setUserName(customizationData.name || '');
      setUserRole(customizationData.occupation || '');
      setAiTraits(customizationData.traits || []);
      setUserInterests(customizationData.about || '');
    }
  }, [customizationData]);

  // useLiveQuery must be called inside the component
  const apiKeys = useLiveQuery(async () => {
    const keys: Record<string, string> = {};
    for (const provider of apiKeyProviders) {
      const key = await db.apikeys.get(provider.id);
      keys[provider.id] = key?.value || '';
    }
    return keys;
  }, [apiKeyProviders], {} as Record<string, string>);

  // Manage all input values for API keys in a single state object
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Sync input values with stored keys when apiKeys changes
  useEffect(() => {
    if (apiKeys) {
      setInputValues((prev) => {
        const updated: Record<string, string> = { ...prev };
        for (const provider of apiKeyProviders) {
          const key = provider.id;
          if (apiKeys[key] !== undefined && prev[key] === undefined) {
            updated[key] = apiKeys[key];
          }
        }
        return updated;
      });
    }
  }, [apiKeys]);

  const suggestedTraits = ['friendly', 'witty', 'concise', 'curious', 'empathetic', 'creative', 'patient', 'formal', 'casual', 'humorous', 'sarcastic', 'direct', 'detailed', 'technical'];

  const addTrait = (trait: string) => {
    const trimmedTrait = trait.trim().toLowerCase();
    if (trimmedTrait && !aiTraits.includes(trimmedTrait) && aiTraits.length < 50) {
      setAiTraits([...aiTraits, trimmedTrait]);
    }
  };

  const handleSaveCustomization = () => {
    const currentCustomization = ydoc.getMap('customisation').get('userProfile') || { id: 'userProfile' };
    ydoc.getMap('customisation').set('userProfile', {
      ...currentCustomization,
      name: userName,
      occupation: userRole,
      traits: aiTraits,
      about: userInterests,
    });
    toast.success('Preferences saved!');
  };

  const handleTraitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addTrait(currentTrait);
      setCurrentTrait('');
    }
  };

  const removeTrait = (traitToRemove: string) => {
    setAiTraits(aiTraits.filter((trait) => trait !== traitToRemove));
  };

  // TTS State
  const ttsSettings = useLiveQuery(() => db.customisation.get('ttsSettings'), []);
  const isTtsEnabled = ttsSettings?.config?.enabled || false;
  const selectedTtsVoice = ttsSettings?.config?.voiceId || ttsVoices[0].id;

  const handleTtsToggle = (enabled: boolean) => {
    const currentSettings = ydoc.getMap('customisation').get('ttsSettings') || { id: 'ttsSettings', config: {} };
    ydoc.getMap('customisation').set('ttsSettings', {
      ...currentSettings,
      id: 'ttsSettings',
      config: {
        ...((currentSettings as any).config || {}),
        enabled,
      }
    });
  };

  const handleVoiceChange = (voiceId: string) => {
    const currentSettings = ydoc.getMap('customisation').get('ttsSettings') || { id: 'ttsSettings', config: {} };
    ydoc.getMap('customisation').set('ttsSettings', {
       ...currentSettings,
       id: 'ttsSettings',
      config: {
        ...((currentSettings as any).config || {}),
        voiceId,
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="fixed inset-0 w-screen h-{100dvh} bg-background text-foreground flex flex-col z-50">
        {/* Top bar with back button */}
        <div className="flex items-center border-b border-border bg-background px-4 py-2">
          <Button size="icon" variant="ghost" className="hover:text-foreground hover:bg-transparent focus-visible:bg-transparent" onClick={() => router.back()} aria-label="Back to Chat">
            <ArrowLeft size={22} />
          </Button>
          <div className="flex-1 text-center font-semibold text-lg">Settings</div>
          <ThemeToggle />
        </div>
        {/* Tabs */}
        <div className="w-full border-b border-border bg-background px-6">
          <div className="max-w-6xl">
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex whitespace-nowrap">
                <button
                  onClick={() => setTab('customization')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'customization' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  Customization
                </button>
                <button
                  onClick={() => setTab('models')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'models' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  Models
                </button>
                <button
                  onClick={() => setTab('openroutermodels')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'openroutermodels' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  OpenRouter Models
                </button>
                <button
                  onClick={() => setTab('apikeys')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'apikeys' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  API Keys
                </button>
                <button
                  onClick={() => setTab('experimental')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'experimental' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  Experimental
                </button>
                <button
                  onClick={() => setTab('export')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'export' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  Export
                </button>
                <button
                  onClick={() => setTab('sync')}
                  className={`px-4 md:px-6 py-4 font-semibold border-b-2 transition-colors ${tab === 'sync' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'}`}
                >
                  Sync
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {tab === 'customization' ? (
            <>
              {/* Main settings content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">Customize your AI Assistant</h2>
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-1">What should the AI Assistant call you?</label>
                  <input
                    className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground"
                    placeholder="Enter your name"
                    maxLength={50}
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-1">What do you do?</label>
                  <input
                    className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground"
                    placeholder="Engineer, student, etc."
                    maxLength={100}
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-1">What traits should your AI Assistant have? <span className="text-xs text-muted-foreground">(up to 50, max 100 chars each)</span></label>
                  <input
                    className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground"
                    placeholder="Type a trait and press Enter or Tab..."
                    maxLength={100}
                    value={currentTrait}
                    onChange={(e) => setCurrentTrait(e.target.value)}
                    onKeyDown={handleTraitKeyDown}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aiTraits.map((trait, index) => (
                      <span key={index} className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-1 capitalize">
                        {trait}
                        <button onClick={() => removeTrait(trait)} className="text-muted-foreground hover:text-foreground">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">Suggestions</label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTraits.map((trait) => (
                        <button
                          key={trait}
                          type="button"
                          onClick={() => addTrait(trait)}
                          disabled={aiTraits.includes(trait)}
                          className="bg-muted text-muted-foreground hover:bg-muted/80 px-3 py-1.5 rounded-full text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-opacity capitalize"
                        >
                          {trait}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-1">Anything else your AI Assistant should know about you?</label>
                  <textarea
                    className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground"
                    rows={3}
                    maxLength={3000}
                    placeholder="Interests, values, or preferences to keep in mind"
                    value={userInterests}
                    onChange={(e) => setUserInterests(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="button" className="text-primary-foreground border-none bg-primary" onClick={handleSaveCustomization}>Save Preferences</Button>
                </div>
              </div>
              {/* Keyboard Shortcuts */}
              <div className="w-full md:w-80 bg-background border-t md:border-t-0 md:border-l border-border p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between"><span>Search</span><span className="bg-muted px-2 py-1 rounded text-xs">⌘ K</span></div>
                    <div className="flex items-center justify-between"><span>New Chat</span><span className="bg-muted px-2 py-1 rounded text-xs">⌘ Shift O</span></div>
                  </div>
                </div>
              </div>
            </>
          ) : tab === 'models' ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-2">Available Models</h2>
              <div className="text-muted-foreground mb-6">A list of all available models and their features.</div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search models by name or provider..."
                  className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground"
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-center">Vision</TableHead>
                    <TableHead className="text-center">Image Gen</TableHead>
                    <TableHead className="text-center">Audio Gen</TableHead>
                    <TableHead className="text-center">Video Gen</TableHead>
                    <TableHead className="text-center">Web Search</TableHead>
                    <TableHead className="text-center">PDF</TableHead>
                    <TableHead className="text-center">Fast</TableHead>
                    <TableHead className="text-center">Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allModels
                    .filter(
                      (model) =>
                        model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
                        model.provider.toLowerCase().includes(modelSearchQuery.toLowerCase())
                    )
                    .map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img src={`/icons/${model.providerLogo}`} alt={model.provider} className="w-6 h-6 rounded" />
                            <span className="font-medium capitalize">{model.provider}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{model.name}</div>
                        </TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.vision} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.image_gen} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.audio_gen} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.video_gen} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.web_search} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.pdf} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.fast} disabled /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={model.features.reasoning} disabled /></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : tab === 'openroutermodels' ? (
            <OpenRouterModelsTab />
          ) : tab === 'apikeys' ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">API Keys</h2>
              <div className="mb-6 text-muted-foreground">Enter your API keys for the providers below. These are stored locally in your browser and never sent to our servers.</div>
              <div className="grid grid-cols-1 gap-6 w-full">
                {apiKeyProviders.map((provider) => {
                  const key = provider.id;
                  const storedKey = apiKeys?.[key] || '';
                  const inputValue = inputValues[key] ?? '';
                  const isSet = (storedKey || '').trim().length > 0;
                  // Use openrouterai.png for Openrouter
                  const logoSrc = provider.name.toLowerCase() === 'openrouter' ? '/icons/openrouterai.png' : `/icons/${provider.logo}`;
                  return (
                    <div key={provider.id} className="bg-card rounded-xl p-6 gap-4 border border-border flex flex-col w-full">
                      <div className="flex items-center mb-4 relative">
                        <img src={logoSrc} alt={provider.name} className="w-7 h-7 rounded mr-2" />
                        <span className="font-semibold text-lg text-card-foreground">
                          {provider.name}
                        </span>
                        <div className="flex items-center gap-2 absolute right-0 top-1/2 -translate-y-1/2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isSet ? 'bg-green-500' : 'bg-red-500'}`} title={isSet ? 'Active' : 'Inactive'} />
                          <span className="text-xs font-normal text-muted-foreground">{isSet ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <input
                        className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground mb-4"
                        placeholder={provider.placeholder}
                        value={inputValue}
                        onChange={e => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        type="password"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className="bg-primary text-primary-foreground border-none hover:bg-primary disabled:opacity-50 w-full"
                          disabled={!inputValue.trim()}
                          onClick={async () => {
                            await db.apikeys.put({ id: key, value: inputValue });
                            toast.success(`${provider.name} API key saved!`, { style: { background: '#22c55e', color: 'white' } });
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : tab === 'experimental' ? (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-8">
              <h2 className="text-2xl font-bold mb-4">Experimental Features</h2>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="tts-switch" className="font-semibold text-lg">AI Text-to-Speech</Label>
                    <p className="text-muted-foreground text-sm mt-1">
                      Enable narration for AI messages. Requires an ElevenLabs API key.
                    </p>
                  </div>
                  <Switch
                    id="tts-switch"
                    checked={isTtsEnabled}
                    onCheckedChange={handleTtsToggle}
                  />
                </div>
                {isTtsEnabled && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <Label className="font-semibold text-lg">Voice</Label>
                    <p className="text-muted-foreground text-sm mt-1 mb-3">
                      Select the voice for the AI narration.
                    </p>
                    <Select value={selectedTtsVoice} onValueChange={handleVoiceChange}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {ttsVoices.map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </motion.div>
          ) : tab === 'export' ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Export Your Data</h2>
              <div className="mb-6 text-muted-foreground">
                You can export your conversations here.
              </div>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold">Export Chats</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select one or more chats to export as a single CSV file.
                  </p>
                  <div className="my-4">
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      className="w-full border-none focus:ring-0 focus:border-none focus:ring-0 rounded-lg px-3 py-2 bg-muted text-foreground"
                      value={exportSearchQuery}
                      onChange={(e) => setExportSearchQuery(e.target.value)}
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedChatIds.length === allChats?.length && allChats?.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedChatIds(allChats?.map(chat => chat.id) || []);
                              } else {
                                setSelectedChatIds([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Chat Title</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allChats
                        ?.filter((chat) =>
                          (chat.title || 'Untitled Chat').toLowerCase().includes(exportSearchQuery.toLowerCase())
                        )
                        .map((chat) => (
                          <TableRow key={chat.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedChatIds.includes(chat.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedChatIds([...selectedChatIds, chat.id]);
                                  } else {
                                    setSelectedChatIds(selectedChatIds.filter(id => id !== chat.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>{chat.title || 'Untitled Chat'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="mt-4" disabled={selectedChatIds.length === 0}>
                        Export Selected ({selectedChatIds.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Export</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to export the selected {selectedChatIds.length} chats?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button
                          onClick={() => {
                            exportSingleChat(selectedChatIds);
                          }}
                        >
                          Export
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold">Export All Chats</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Export all of your conversations as a single CSV file.
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Export All</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Export</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to export all conversations?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={exportAllChats}>Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="p-4 border border-destructive rounded-lg">
                  <h3 className="font-semibold text-destructive">Reset Application</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This will delete all of your chats and conversations. This action cannot be undone.
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Reset All Data</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete all your chat data.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button variant="destructive" onClick={resetAllData}>Reset Everything</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ) : tab === 'sync' ? (
            <SyncTab />
          ) : (
            null
          )}
        </div>
      </div>
    </motion.div>
  );
} 