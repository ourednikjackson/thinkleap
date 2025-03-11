'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Play, RefreshCw, Edit, BarChart2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

interface OaiPmhSource {
  id: string;
  name: string;
  oai_endpoint: string;
  metadata_prefix: string;
  set_spec?: string;
  filter_providers?: string[];
  status: 'active' | 'inactive' | 'harvesting' | 'error';
  last_harvested?: string;
  harvest_frequency: string;
  created_at: string;
  updated_at: string;
}

interface HarvestLog {
  id: number;
  source_id: number;
  source_name: string;
  start_time: string;
  end_time?: string;
  status: 'running' | 'completed' | 'failed';
  records_processed: number;
  records_added: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
}

interface HarvestMetrics {
  total_sources: number;
  active_sources: number;
  total_records: number;
  last_harvest_time?: string;
  sources_by_status: {
    active: number;
    inactive: number;
    harvesting: number;
    error: number;
  };
}

export default function OaiPmhAdminPage() {
  // State
  const [sources, setSources] = useState<OaiPmhSource[]>([]);
  const [logs, setLogs] = useState<HarvestLog[]>([]);
  const [metrics, setMetrics] = useState<HarvestMetrics>({
    total_sources: 0,
    active_sources: 0,
    total_records: 0,
    sources_by_status: {
      active: 0,
      inactive: 0,
      harvesting: 0,
      error: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSource, setEditSource] = useState<OaiPmhSource | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    oai_endpoint: '',
    metadata_prefix: 'oai_dc',
    set_spec: '',
    filter_providers: ['jstor'],
    harvest_frequency: '0 0 * * *', // Default: daily at midnight
    status: 'active' as OaiPmhSource['status']
  });
  
  // Fetch sources, logs, and metrics on initial load
  useEffect(() => {
    fetchSources();
    fetchLogs();
    fetchMetrics();
  }, []);
  
  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/oai-pmh/sources');
      if (!response.ok) {
        throw new Error('Failed to fetch OAI-PMH sources');
      }
      const data = await response.json();
      setSources(data);
    } catch (error) {
      logger.error('Error fetching OAI-PMH sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load OAI-PMH sources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/oai-pmh/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch harvest logs');
      }
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      logger.error('Error fetching harvest logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load harvest logs',
        variant: 'destructive',
      });
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/oai-pmh/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch harvest metrics');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      logger.error('Error fetching harvest metrics:', error);
      // Don't show a toast for metrics error, as it's not critical for the user experience
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked
    });
  };
  
  const handleAddSource = async () => {
    try {
      const response = await fetch('/api/admin/oai-pmh/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add OAI-PMH source');
      }
      
      toast({
        title: 'Success',
        description: 'OAI-PMH source added successfully',
      });
      
      setAddDialogOpen(false);
      resetForm();
      fetchSources();
      fetchMetrics();
    } catch (error) {
      logger.error('Error adding OAI-PMH source:', error);
      toast({
        title: 'Error',
        description: 'Failed to add OAI-PMH source',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditSource = async () => {
    if (!editSource) return;
    
    try {
      const response = await fetch(`/api/admin/oai-pmh/sources/${editSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update OAI-PMH source');
      }
      
      toast({
        title: 'Success',
        description: 'OAI-PMH source updated successfully',
      });
      
      setEditSource(null);
      resetForm();
      fetchSources();
      fetchMetrics();
    } catch (error) {
      logger.error('Error updating OAI-PMH source:', error);
      toast({
        title: 'Error',
        description: 'Failed to update OAI-PMH source',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteSource = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/oai-pmh/sources/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete OAI-PMH source');
      }
      
      toast({
        title: 'Success',
        description: 'OAI-PMH source deleted successfully',
      });
      
      fetchSources();
      fetchMetrics();
    } catch (error) {
      logger.error('Error deleting OAI-PMH source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete OAI-PMH source',
        variant: 'destructive',
      });
    }
  };
  
  const handleStartHarvest = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/oai-pmh/sources/${id}/harvest`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start harvest');
      }
      
      toast({
        title: 'Success',
        description: 'Harvest started successfully',
      });
      
      // Refresh logs and metrics after a short delay
      setTimeout(() => {
        fetchLogs();
        fetchMetrics();
      }, 1000);
    } catch (error) {
      logger.error('Error starting harvest:', error);
      toast({
        title: 'Error',
        description: 'Failed to start harvest',
        variant: 'destructive',
      });
    }
  };
  
  const startEdit = (source: OaiPmhSource) => {
    setEditSource(source);
    setFormData({
      name: source.name,
      oai_endpoint: source.oai_endpoint,
      metadata_prefix: source.metadata_prefix,
      set_spec: source.set_spec || '',
      filter_providers: source.filter_providers || ['jstor'],
      harvest_frequency: source.harvest_frequency,
      status: source.status
    });
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      oai_endpoint: '',
      metadata_prefix: 'oai_dc',
      set_spec: '',
      filter_providers: ['jstor'],
      harvest_frequency: '0 0 * * *', // Default: daily at midnight
      status: 'active' as OaiPmhSource['status']
    });
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  const getStatusStyles = (status: OaiPmhSource['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'harvesting':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">OAI-PMH Management</h1>
          <Button onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Add Source
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.total_sources}</div>
              <p className="text-sm text-muted-foreground">Total Sources</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.active_sources}</div>
              <p className="text-sm text-muted-foreground">Active Sources</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.total_records.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatDate(metrics.last_harvest_time)}</div>
              <p className="text-sm text-muted-foreground">Last Harvest</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Add Source Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <span style={{ display: 'none' }}></span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add OAI-PMH Source</DialogTitle>
            <DialogDescription>
              Add a new OAI-PMH source for harvesting metadata
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="oai_endpoint" className="text-right">OAI-PMH Endpoint</Label>
              <Input
                id="oai_endpoint"
                name="oai_endpoint"
                value={formData.oai_endpoint}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="metadata_prefix" className="text-right">Metadata Prefix</Label>
              <Select
                value={formData.metadata_prefix}
                onValueChange={(value) => handleSelectChange('metadata_prefix', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select metadata format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oai_dc">Dublin Core (oai_dc)</SelectItem>
                  <SelectItem value="marcxml">MARC XML</SelectItem>
                  <SelectItem value="mods">MODS</SelectItem>
                  <SelectItem value="nlm">NLM/JATS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="set_spec" className="text-right">Set Spec (Optional)</Label>
              <Input
                id="set_spec"
                name="set_spec"
                value={formData.set_spec}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="harvest_frequency" className="text-right">Harvest Schedule</Label>
              <Input
                id="harvest_frequency"
                name="harvest_frequency"
                placeholder="CRON format (e.g., 0 0 * * *)"
                value={formData.harvest_frequency}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSource}>Add Source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={!!editSource} onOpenChange={(open) => !open && setEditSource(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit OAI-PMH Source</DialogTitle>
            <DialogDescription>
              Update the OAI-PMH source configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-oai_endpoint" className="text-right">OAI-PMH Endpoint</Label>
              <Input
                id="edit-oai_endpoint"
                name="oai_endpoint"
                value={formData.oai_endpoint}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-metadata_prefix" className="text-right">Metadata Prefix</Label>
              <Select
                value={formData.metadata_prefix}
                onValueChange={(value) => handleSelectChange('metadata_prefix', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select metadata format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oai_dc">Dublin Core (oai_dc)</SelectItem>
                  <SelectItem value="marcxml">MARC XML</SelectItem>
                  <SelectItem value="mods">MODS</SelectItem>
                  <SelectItem value="nlm">NLM/JATS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-set_spec" className="text-right">Set Spec (Optional)</Label>
              <Input
                id="edit-set_spec"
                name="set_spec"
                value={formData.set_spec}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-harvest_frequency" className="text-right">Harvest Schedule</Label>
              <Input
                id="edit-harvest_frequency"
                name="harvest_frequency"
                placeholder="CRON format (e.g., 0 0 * * *)"
                value={formData.harvest_frequency}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSource(null)}>Cancel</Button>
            <Button onClick={handleEditSource}>Update Source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sources Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>OAI-PMH Sources</CardTitle>
          <CardDescription>
            Manage data sources for harvesting metadata via OAI-PMH protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Set</TableHead>
                <TableHead>Harvest Schedule</TableHead>
                <TableHead>Last Harvested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                    {loading ? 'Loading...' : 'No OAI-PMH sources found. Add a source to get started.'}
                  </TableCell>
                </TableRow>
              )}
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>{source.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={source.oai_endpoint}>
                    {source.oai_endpoint}
                  </TableCell>
                  <TableCell>{source.metadata_prefix}</TableCell>
                  <TableCell>{source.set_spec || '-'}</TableCell>
                  <TableCell>{source.harvest_frequency}</TableCell>
                  <TableCell>{formatDate(source.last_harvested)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusStyles(source.status)
                    }`}>
                      {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => startEdit(source)}
                        title="Edit source"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleStartHarvest(source.id)}
                        title="Start harvest"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="text-red-500 hover:text-red-600" 
                            title="Delete source"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the OAI-PMH source "{source.name}" and all associated harvest logs.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteSource(source.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={fetchSources} title="Refresh sources">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Sources
          </Button>
        </CardFooter>
      </Card>
      
      {/* Harvest Logs Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Harvest Logs</CardTitle>
          <CardDescription>
            Recent OAI-PMH harvest operations and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                    No harvest logs found. Start a harvest to see logs.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.source_name}</TableCell>
                  <TableCell>{formatDate(log.start_time)}</TableCell>
                  <TableCell>{log.end_time ? formatDate(log.end_time) : '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      log.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell>{log.records_processed}</TableCell>
                  <TableCell>{log.records_added}</TableCell>
                  <TableCell>{log.records_updated}</TableCell>
                  <TableCell>{log.records_failed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLogs} title="Refresh logs">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Logs
            </Button>
            <Button variant="outline" onClick={fetchMetrics} title="Refresh metrics">
              <BarChart2 className="mr-2 h-4 w-4" /> Refresh Metrics
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
