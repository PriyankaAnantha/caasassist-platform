"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { FileUpload } from "@/components/file-upload"
import { Loader2, Upload, FileText, AlertCircle, CheckCircle, Info, X, MessageSquare } from "lucide-react"

export default function FineTuningPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = createClient()
  
  const [baseUrl, setBaseUrl] = useState<string>("")
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isTraining, setIsTraining] = useState<boolean>(false)
  const [trainingJobId, setTrainingJobId] = useState<string>("")
  const [trainingStatus, setTrainingStatus] = useState<string>("")
  const [trainingProgress, setTrainingProgress] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false)

  // Check training status periodically
  useEffect(() => {
    if (!trainingJobId || !isTraining) return

    const interval = setInterval(async () => {
      try {
        setIsCheckingStatus(true)
        const response = await fetch(`${baseUrl}/status/${trainingJobId}`)
        if (!response.ok) throw new Error('Failed to fetch training status')
        
        const status = await response.json()
        setTrainingStatus(status.status)
        setTrainingProgress(status.progress || 0)
        
        // Fetch logs
        const logsResponse = await fetch(`${baseUrl}/logs/${trainingJobId}`)
        if (logsResponse.ok) {
          const logsData = await logsResponse.json()
          setLogs(logsData.logs || [])
        }

        // Check if training is complete
        if (status.status === 'completed' || status.status === 'failed') {
          setIsTraining(false)
          clearInterval(interval)
          
          toast({
            title: `Training ${status.status}`,
            description: status.status === 'completed' 
              ? 'Model training completed successfully!' 
              : 'Model training failed. Please check the logs.'
          })
        }
      } catch (error) {
        console.error('Error checking training status:', error)
      } finally {
        setIsCheckingStatus(false)
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [trainingJobId, isTraining, baseUrl])

  const handleFileSelected = async (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0])
      
      // Auto-upload the file
      const formData = new FormData();
      formData.append('file', files[0]);
      
      try {
        const response = await fetch(`${baseUrl}/upload`, {
          method: 'POST',
          body: formData,
          // Add a longer timeout for large files
          signal: AbortSignal.timeout(300000), // 5 minutes
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Upload failed');
        }
        
        const result = await response.json();
        handleUploadComplete(result);
      } catch (error: any) {
        console.error('Upload error:', error);
        handleUploadError(error?.message || 'Failed to upload file');
      }
    }
  }

  const handleUploadComplete = (response: any) => {
    toast({
      title: "File uploaded successfully",
      description: response.filename,
    })
  }

  const handleUploadError = (error: string) => {
    toast({
      title: "Upload failed",
      description: error,
      variant: "destructive",
    })
  }

  const startTraining = async () => {
    if (!selectedModel || !uploadedFile) {
      toast({
        title: "Error",
        description: "Please select a model and upload a dataset first",
        variant: "destructive",
      })
      return
    }

    try {
      setIsTraining(true)
      setTrainingStatus("starting")
      setLogs(["Starting training process..."])
      
      const formData = new FormData()
      formData.append("model_name", selectedModel)
      formData.append("dataset_file", uploadedFile.name)

      const response = await fetch(`${baseUrl}/train`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to start training')
      }

      const data = await response.json()
      setTrainingJobId(data.job_id)
      
      toast({
        title: "Training started",
        description: `Job ID: ${data.job_id}`,
      })
    } catch (error) {
      console.error('Training error:', error)
      setIsTraining(false)
      setTrainingStatus("error")
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setLogs(prev => [...prev, `Error: ${errorMessage}`])
      
      toast({
        title: "Training failed to start",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const testConnection = async () => {
    if (!baseUrl) {
      toast({
        title: "Error",
        description: "Please enter a valid API URL",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Ensure baseUrl is clean (remove trailing slash if any)
      const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // First test the root endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const rootResponse = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!rootResponse.ok) {
        throw new Error(`API root endpoint returned status ${rootResponse.status}`);
      }

      // Then test the models endpoint
      const modelsController = new AbortController();
      const modelsTimeoutId = setTimeout(() => modelsController.abort(), 10000); // 10 second timeout
      
      const modelsResponse = await fetch(`${cleanUrl}/models`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: modelsController.signal,
      });
      
      clearTimeout(modelsTimeoutId);

      if (!modelsResponse.ok) {
        const errorText = await modelsResponse.text();
        console.error('Models endpoint error:', errorText);
        throw new Error(`Failed to fetch models (status ${modelsResponse.status})`);
      }

      const models = await modelsResponse.json();
      
      // If models is an array, use it directly, otherwise try to get models from the response
      const modelList = Array.isArray(models) ? models : models.models || [];
      
      toast({
        title: "Connection Successful",
        description: `Connected to Unsloth API. Found ${modelList.length} available models.`,
      });
      
      setAvailableModels(modelList);
      setIsConnected(true);
      
      return true;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        title: "Connection Failed",
        description: `Could not connect to the API: ${errorMessage}`,
        variant: "destructive",
      });
      return false;
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col items-center mb-8">
        <div className="w-full flex justify-between items-center mb-2">
          <div className="w-10"></div> {/* Empty div for balance */}
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Fine-tuning Workspace</h1>
          </div>
          <div className="w-10 flex justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => router.push('/chat')}
              title="Back to Chat"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="sr-only">Back to Chat</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M10.42 12.61a2.13 2.13 0 0 1 2.45.5c.3.3.53.72.53 1.16 0 .9-.7 1.22-.91 1.3-.9.31-.71 1.66.12 1.8 1.18.2 1.99 1.24 1.99 2.4 0 .9-.7 1.63-1.56 1.63-1.47 0-2.51-1.77-1.5-3.3"></path>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto text-center">
            Upload your dataset and fine-tune models with just a few clicks
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Connection Card */}
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">API Connection</CardTitle>
              <CardDescription className="text-xs">Connect to your fine-tuning API</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input
                  placeholder="https://your-ngrok-url.ngrok.io/"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your ngrok URL or local API endpoint
                </p>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={testConnection}
              >
                <Info className="mr-2 h-4 w-4" />
                Test Connection
              </Button>
            </CardContent>
          </Card>

          {/* Model Configuration Card */}
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-2">
                <Label>Model Name</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Select a base model to fine-tune
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Upload Card */}
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Training Data</CardTitle>
              <CardDescription className="text-xs">Upload your training files</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <FileUpload
                onFilesSelected={handleFileSelected}
                onUploadComplete={handleUploadComplete}
                onError={handleUploadError}
                accept=".jsonl,.json,.txt,.md,.pdf"
                maxFiles={1}
                maxSize={50 * 1024 * 1024} // 50MB
                apiUrl={baseUrl}
              />
              {uploadedFile && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Selected Files:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <div key={0} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1 truncate">
                        <p className="text-sm truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Progress Card */}
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Training Progress</CardTitle>
              <CardDescription className="text-xs">
                {trainingStatus === 'idle' ? 'Ready to start training' : 
                 trainingStatus === 'starting' ? 'Starting training...' :
                 trainingStatus === 'running' ? 'Training in progress...' :
                 trainingStatus === 'completed' ? 'Training completed!' : 'Training failed'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{trainingProgress}%</span>
                </div>
                <Progress value={trainingProgress} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <Label>Training Logs</Label>
                <div className="h-40 overflow-y-auto p-3 bg-muted/50 rounded-md text-sm font-mono">
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div key={i} className="py-1">
                        <span className="text-muted-foreground">$</span> {log}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No logs yet</p>
                  )}
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={startTraining}
                disabled={!isConnected || !selectedModel || !uploadedFile}
              >
                {isTraining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Training in Progress...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Fine-tuning
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
