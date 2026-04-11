import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Upload,
  FileImage,
  Trash2,
  Loader2,
  Cloud,
  Database,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Users
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/AdminLayout";

interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
  source: 'local' | 'supabase';
}

interface PayslipFile {
  path: string;
  name: string;
  publicUrl: string;
  size?: number;
  updatedAt?: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminUploads() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedTrainer, setSelectedTrainer] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch uploaded files from local uploads directory
  const { data: localFiles = [], isLoading: isLoadingLocal } = useQuery<UploadedFile[]>({
    queryKey: ["/api/uploads/list"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/uploads/list");
        if (res.ok) return res.json();
        return [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Supabase storage stats
  const { data: supabaseStats } = useQuery({
    queryKey: ["/api/uploads/supabase-stats"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/uploads/supabase-stats");
        if (res.ok) return res.json();
        return null;
      } catch {
        return null;
      }
    },
  });

  // Fetch all trainers
  const { data: trainers = [] } = useQuery<Trainer[]>({
    queryKey: ["/api/users/role/trainer"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users/role/trainer");
        if (res.ok) return res.json();
        return [];
      } catch {
        return [];
      }
    },
  });

  // Fetch payslips from Supabase
  const { data: payslips = [], isLoading: isLoadingPayslips } = useQuery<PayslipFile[]>({
    queryKey: ["/api/payslips/list", selectedTrainer],
    queryFn: async () => {
      try {
        const url = selectedTrainer === "all" 
          ? "/api/payslips/list" 
          : `/api/payslips/list?trainerId=${selectedTrainer}`;
        const res = await apiRequest("GET", url);
        if (res.ok) return res.json();
        return [];
      } catch {
        return [];
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { file?: File; url?: string }) => {
      const formData = new FormData();
      if (data.file) {
        formData.append('file', data.file);
      }
      if (data.url) {
        formData.append('url', data.url);
      }
      
      const res = await apiRequest("POST", "/api/uploads", formData);
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/list"] });
      toast({ 
        title: "Upload Successful", 
        description: `File uploaded to ${result.source === 'supabase' ? 'Supabase' : 'local storage'}` 
      });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadUrl("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/uploads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/list"] });
      toast({ title: "File deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deletePayslipMutation = useMutation({
    mutationFn: async (path: string) => {
      await apiRequest("DELETE", `/api/payslips/${path}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payslips/list", selectedTrainer] });
      toast({ title: "Payslip deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleUpload = () => {
    if (uploadMode === 'file' && selectedFile) {
      uploadMutation.mutate({ file: selectedFile });
    } else if (uploadMode === 'url' && uploadUrl) {
      uploadMutation.mutate({ url: uploadUrl });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">
            UPLOADS MANAGEMENT
          </h1>
          <p className="text-muted-foreground">
            Manage avatar uploads and view trainer payslips.
          </p>
        </div>

        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="payslips" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Trainer Payslips
            </TabsTrigger>
          </TabsList>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6 mt-6">

        {/* Storage Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-500" />
                Supabase Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supabaseStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Files</span>
                    <span className="font-medium">{supabaseStats.fileCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage Used</span>
                    <span className="font-medium">{formatFileSize(supabaseStats.totalSize || 0)}</span>
                  </div>
                  <Badge variant="outline" className="mt-2">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    Connected
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Not configured
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-500" />
                Local Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Local Files</span>
                  <span className="font-medium">{localFiles.filter((f: UploadedFile) => f.source === 'local').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supabase Files</span>
                  <span className="font-medium">{localFiles.filter((f: UploadedFile) => f.source === 'supabase').length}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/uploads/list"] });
                    toast({ title: "Refreshed" });
                  }}
                >
                  Refresh List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Uploaded Files
              </span>
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Image</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* Upload Mode Toggle */}
                    <div className="flex gap-2">
                      <Button 
                        variant={uploadMode === 'file' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('file')}
                        className="flex-1"
                      >
                        File Upload
                      </Button>
                      <Button 
                        variant={uploadMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('url')}
                        className="flex-1"
                      >
                        From URL
                      </Button>
                    </div>

                    {uploadMode === 'file' ? (
                      <div className="space-y-2">
                        <Label>Select File</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={uploadUrl}
                          onChange={(e) => setUploadUrl(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload}
                      disabled={((uploadMode === 'file' && !selectedFile) || (uploadMode === 'url' && !uploadUrl)) || uploadMutation.isPending}
                    >
                      {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingLocal ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : localFiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No uploaded files found.</p>
                <p className="text-sm">Upload a new file to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {localFiles.map((file: UploadedFile) => (
                  <Card key={file.id} className="overflow-hidden">
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        variant={file.source === 'supabase' ? 'default' : 'secondary'}
                        className="absolute top-1 right-1 text-[10px] px-1 py-0 h-4"
                      >
                        {file.source === 'supabase' ? 'SB' : 'Local'}
                      </Badge>
                    </div>
                    <CardContent className="p-2">
                      <p className="font-medium text-xs truncate">{file.filename}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-[10px] px-1 flex-1"
                          onClick={() => navigator.clipboard.writeText(file.url)}
                        >
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Delete this file?')) {
                              deleteMutation.mutate(file.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Migration Helper */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Supabase Storage:</strong> All new uploads automatically go to Supabase.</p>
              <p><strong>Local Storage:</strong> Legacy uploads remain in local storage.</p>
              <p className="text-muted-foreground">
                Run migration scripts to move local files to Supabase:
              </p>
              <code className="block bg-background p-2 rounded mt-2 text-xs">
                npx tsx script/migrate-avatars-to-supabase.ts
              </code>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Payslips Tab */}
          <TabsContent value="payslips" className="space-y-6 mt-6">
            {/* Trainer Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Filter by Trainer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center">
                  <Label className="whitespace-nowrap">Select Trainer:</Label>
                  <select
                    value={selectedTrainer}
                    onChange={(e) => setSelectedTrainer(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="all">All Trainers</option>
                    {trainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Payslips List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Payslip PDFs
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/payslips/list", selectedTrainer] })}
                  >
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPayslips ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : payslips.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payslips found.</p>
                    <p className="text-sm">Generate payslips from the Salary page to see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payslips.map((payslip: PayslipFile) => {
                      // Extract trainer info from path
                      const pathParts = payslip.path.split('/');
                      const trainerId = pathParts.length > 1 ? pathParts[0] : null;
                      const trainer = trainers.find(t => t.id === trainerId);
                      const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : trainerId || 'Unknown';

                      // Extract month and year from filename
                      const filenameMatch = payslip.name.match(/payslip-(.+)-(.+)-(\d{4})\.pdf/);
                      const trainerFirstName = filenameMatch ? filenameMatch[1] : '';
                      const month = filenameMatch ? filenameMatch[2] : '';
                      const year = filenameMatch ? filenameMatch[3] : '';

                      return (
                        <Card key={payslip.path} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-red-500" />
                                  <p className="font-medium">
                                    {trainerFirstName} - {month} {year}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {trainerName}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {payslip.size ? formatFileSize(payslip.size) : 'Unknown size'}
                                  {payslip.updatedAt && (
                                    <>
                                      {' • '}
                                      {new Date(payslip.updatedAt).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-md">
                                  {payslip.publicUrl}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => window.open(payslip.publicUrl, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Delete this payslip for ${trainerFirstName} ${month} ${year}?`)) {
                                      deletePayslipMutation.mutate(encodeURIComponent(payslip.path));
                                    }
                                  }}
                                  disabled={deletePayslipMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payslip Info */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">About Payslips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Storage Location:</strong> All payslips are stored in Supabase Storage in the "payslips" bucket.</p>
                  <p><strong>Organization:</strong> Files are organized by trainer ID for easy management.</p>
                  <p><strong>Generation:</strong> Payslips are generated as PDFs from the Salary Management page when you click "Generate & Upload Payslip".</p>
                  <p className="text-muted-foreground">
                    Each payslip is named with the format: <code className="bg-background px-2 py-0.5 rounded">payslip-[FirstName]-[Month]-[Year].pdf</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
