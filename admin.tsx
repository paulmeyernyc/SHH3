import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LayoutWithSidebar } from "@/components/layout-with-sidebar";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  FileText,
  Filter,
  Lock,
  LucideIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  Users,
  UserCog,
  Activity,
  Layers,
  Network
} from "lucide-react";

// Sample data
const systemMetrics = [
  { name: "Jan", cpu: 65, memory: 58, storage: 40 },
  { name: "Feb", cpu: 59, memory: 55, storage: 45 },
  { name: "Mar", cpu: 80, memory: 67, storage: 60 },
  { name: "Apr", cpu: 81, memory: 70, storage: 65 },
  { name: "May", cpu: 56, memory: 60, storage: 70 },
  { name: "Jun", cpu: 55, memory: 58, storage: 60 },
  { name: "Jul", cpu: 40, memory: 45, storage: 50 },
];

const userActivity = [
  { name: "Patients", value: 540 },
  { name: "Providers", value: 280 },
  { name: "Admins", value: 30 },
  { name: "Partners", value: 120 },
];

const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const securityAlerts = [
  {
    id: 1,
    type: "Critical",
    message: "Unusual login pattern detected from IP 192.168.1.45",
    timestamp: "2 hours ago",
    status: "New",
  },
  {
    id: 2,
    type: "Warning",
    message: "Failed login attempts exceed threshold for user jsmith",
    timestamp: "4 hours ago",
    status: "Investigating",
  },
  {
    id: 3,
    type: "Info",
    message: "Security scan completed - all systems clear",
    timestamp: "Yesterday",
    status: "Resolved",
  },
  {
    id: 4,
    type: "Critical",
    message: "API key rotation required for integration-gateway",
    timestamp: "2 days ago",
    status: "Resolved",
  },
];

const systemStatus = [
  {
    id: 1,
    name: "Authentication Service",
    status: "Operational",
    uptime: "99.98%",
    icon: Shield,
  },
  {
    id: 2,
    name: "FHIR API Gateway",
    status: "Operational",
    uptime: "99.95%",
    icon: Network,
  },
  {
    id: 3,
    name: "Claims Processing",
    status: "Degraded",
    uptime: "98.72%",
    icon: FileText,
  },
  {
    id: 4,
    name: "User Directory",
    status: "Operational",
    uptime: "100%",
    icon: Users,
  },
  {
    id: 5,
    name: "Database Cluster",
    status: "Operational",
    uptime: "99.99%",
    icon: Server,
  },
  {
    id: 6,
    name: "Consent Service",
    status: "Operational",
    uptime: "99.97%",
    icon: Lock,
  },
];

const pendingApprovals = [
  {
    id: 1,
    type: "Provider",
    name: "Dr. Emily Chen",
    organization: "Metro Medical Center",
    submitted: "2023-04-12",
    status: "Pending",
  },
  {
    id: 2,
    type: "Organization",
    name: "Northside Health Partners",
    organization: "-",
    submitted: "2023-04-11",
    status: "Pending",
  },
  {
    id: 3,
    type: "Integration",
    name: "Lab Results API",
    organization: "Quest Diagnostics",
    submitted: "2023-04-10",
    status: "Pending",
  },
  {
    id: 4,
    type: "Provider",
    name: "Dr. Michael Rodriguez",
    organization: "Valley Care Associates",
    submitted: "2023-04-09",
    status: "Pending",
  },
];

// Admin Users Management Component
function UsersManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Form data for creating/editing user
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "user"
  });
  
  // Fetch users from API
  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/users'],
    retry: 1,
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter users based on search query (client-side for now)
  };
  
  const handleCreateUser = () => {
    createUserMutation.mutate(formData);
  };
  
  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    // Only include fields that were actually changed
    const changedData: any = {};
    if (formData.name !== selectedUser.name) changedData.name = formData.name;
    if (formData.email !== selectedUser.email) changedData.email = formData.email;
    if (formData.role !== selectedUser.role) changedData.role = formData.role;
    if (formData.password) changedData.password = formData.password;
    
    updateUserMutation.mutate({ id: selectedUser.id, userData: changedData });
  };
  
  const handleDeleteUser = (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      password: "", // Don't pre-fill password
      role: user.role || "user"
    });
    setIsEditModalOpen(true);
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "user"
    });
    setSelectedUser(null);
  };
  
  // Filter users based on search query
  const filteredUsers = searchQuery 
    ? users.filter((user: any) => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, permissions, and access
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
            >
              <UserCog size={16} /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="relative w-72">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-8 pr-4 py-2 border rounded-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </form>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter size={16} /> Filter
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download size={16} /> Export
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border">
            <div className="grid grid-cols-6 p-3 bg-muted/50 font-medium text-sm">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Username</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            
            <div className="divide-y">
              {isLoading ? (
                <div className="py-6 text-center">Loading users...</div>
              ) : error ? (
                <div className="py-6 text-center text-red-500">Error loading users: {(error as Error).message}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-6 text-center">No users found</div>
              ) : (
                filteredUsers.map((user: any) => (
                  <div key={user.id} className="grid grid-cols-6 p-3 text-sm items-center">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-muted-foreground">{user.email}</div>
                    <div>
                      <Badge variant="outline">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Badge>
                    </div>
                    <div>{user.username}</div>
                    <div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deleteUserMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex justify-between mt-4 text-sm text-muted-foreground">
            <div>Showing {filteredUsers.length} of {users.length} users</div>
          </div>
        </CardContent>
      </Card>
      
      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded-md"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded-md"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="provider">Provider</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit User: {selectedUser.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={formData.username}
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded-md"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded-md"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave empty to keep current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="provider">Provider</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Admin Dashboard Component
function Dashboard() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col space-y-1">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <CardDescription>All system users</CardDescription>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">970</div>
            <p className="text-xs text-muted-foreground">
              +8.2% from last month
            </p>
            <div className="mt-4">
              <LineChart 
                data={{
                  labels: systemMetrics.map(d => d.name),
                  datasets: [{
                    label: 'Users',
                    data: systemMetrics.map(d => d.cpu),
                    borderColor: '#8884d8',
                    tension: 0.4
                  }]
                }}
                height={60}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col space-y-1">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <CardDescription>Service availability</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.7%</div>
            <p className="text-xs text-muted-foreground">
              -0.1% from last week
            </p>
            <div className="mt-4">
              <LineChart 
                data={{
                  labels: systemMetrics.map(d => d.name),
                  datasets: [{
                    label: 'System Health',
                    data: systemMetrics.map(d => d.memory),
                    borderColor: '#82ca9d',
                    tension: 0.4
                  }]
                }}
                height={60}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col space-y-1">
              <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
              <CardDescription>Connected systems</CardDescription>
            </div>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">134</div>
            <p className="text-xs text-muted-foreground">
              +12 new this month
            </p>
            <div className="mt-4">
              <LineChart 
                data={{
                  labels: systemMetrics.map(d => d.name),
                  datasets: [{
                    label: 'Active Integrations',
                    data: systemMetrics.map(d => d.storage),
                    borderColor: '#ffc658',
                    tension: 0.4
                  }]
                }}
                height={60}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>
              Resource utilization over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <LineChart 
                data={{
                  labels: systemMetrics.map(d => d.name),
                  datasets: [
                    {
                      label: 'CPU %',
                      data: systemMetrics.map(d => d.cpu),
                      borderColor: '#8884d8',
                      tension: 0.4
                    },
                    {
                      label: 'Memory %',
                      data: systemMetrics.map(d => d.memory),
                      borderColor: '#82ca9d',
                      tension: 0.4
                    },
                    {
                      label: 'Storage %',
                      data: systemMetrics.map(d => d.storage),
                      borderColor: '#ffc658',
                      tension: 0.4
                    }
                  ]
                }}
                height={300}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      }
                    },
                    y: {
                      beginAtZero: true,
                      max: 100
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>
              Breakdown by user type
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div style={{ height: '300px' }}>
              <PieChart 
                data={{
                  labels: userActivity.map(item => item.name),
                  datasets: [
                    {
                      data: userActivity.map(item => item.value),
                      backgroundColor: colors,
                      borderWidth: 1
                    }
                  ]
                }}
                height={300}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Security Alerts</CardTitle>
                <CardDescription>
                  Recent security events requiring attention
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <RefreshCw size={16} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg border">
                  {alert.type === "Critical" ? (
                    <AlertCircle className="h-5 w-5 mt-0.5 text-red-500" />
                  ) : alert.type === "Warning" ? (
                    <AlertCircle className="h-5 w-5 mt-0.5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div className="font-medium">
                        {alert.type}
                        <Badge 
                          className="ml-2"
                          variant={
                            alert.status === "New" ? "destructive" : 
                            alert.status === "Investigating" ? "default" : 
                            "outline"
                          }
                        >
                          {alert.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-3 w-3" /> {alert.timestamp}
                      </div>
                    </div>
                    <p className="mt-1 text-sm">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current operational status of all services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemStatus.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <service.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">Uptime: {service.uptime}</div>
                    </div>
                  </div>
                  <Badge 
                    variant={service.status === "Operational" ? "outline" : "destructive"}
                    className={service.status === "Operational" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Items requiring administrator review and approval
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ClipboardList size={16} /> View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-6 p-3 bg-muted/50 font-medium text-sm">
              <div>Type</div>
              <div>Name</div>
              <div>Organization</div>
              <div>Submitted</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            
            <div className="divide-y">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="grid grid-cols-6 p-3 text-sm">
                  <div>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                  <div className="font-medium">{item.name}</div>
                  <div>{item.organization}</div>
                  <div>{item.submitted}</div>
                  <div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">Review</Button>
                    <Button variant="ghost" size="sm">Deny</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Security Management Component
function SecurityManagement() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Configure security policies and audit settings
            </CardDescription>
          </div>
          <Button variant="outline" className="flex items-center gap-1">
            <Shield size={16} /> Security Scan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="policies">
          <TabsList className="mb-4">
            <TabsTrigger value="policies">Security Policies</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          </TabsList>
          
          <TabsContent value="policies">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Password Policy</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure password complexity, rotation, and history requirements
                      </p>
                    </div>
                    <Button size="sm">Configure</Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Multi-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set MFA requirements for different user roles and access levels
                      </p>
                    </div>
                    <Button size="sm">Configure</Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Session Management</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure session timeout, concurrent sessions, and device restrictions
                      </p>
                    </div>
                    <Button size="sm">Configure</Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">IP Access Restrictions</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set allowed IP ranges and geo-location restrictions for system access
                      </p>
                    </div>
                    <Button size="sm">Configure</Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="audit">
            <div className="space-y-4">
              <div className="flex justify-between mb-4">
                <div className="relative w-72">
                  <input
                    type="text"
                    placeholder="Search audit logs..."
                    className="w-full pl-8 pr-4 py-2 border rounded-md"
                  />
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Filter size={16} /> Filter
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Download size={16} /> Export
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                <div className="grid grid-cols-5 p-3 bg-muted/50 font-medium text-sm">
                  <div>Timestamp</div>
                  <div>User</div>
                  <div>Action</div>
                  <div>Resource</div>
                  <div>IP Address</div>
                </div>
                
                <div className="divide-y">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="grid grid-cols-5 p-3 text-sm items-center">
                      <div className="text-muted-foreground">2023-04-14 12:32:15</div>
                      <div className="font-medium">admin@smarthealth.hub</div>
                      <div>
                        <Badge variant="outline">User Update</Badge>
                      </div>
                      <div>users/105</div>
                      <div>192.168.1.45</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                <div>Showing 5 of 1,243 logs</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>Previous</Button>
                  <Button variant="outline" size="sm">Next</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="apikeys">
            <div className="space-y-4">
              <Button className="mb-4">Generate New API Key</Button>
              
              <div className="rounded-md border">
                <div className="grid grid-cols-5 p-3 bg-muted/50 font-medium text-sm">
                  <div>Key Name</div>
                  <div>Created</div>
                  <div>Expires</div>
                  <div>Status</div>
                  <div className="text-right">Actions</div>
                </div>
                
                <div className="divide-y">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-5 p-3 text-sm items-center">
                      <div className="font-medium">Integration Gateway Key</div>
                      <div className="text-muted-foreground">2023-01-14</div>
                      <div className="text-muted-foreground">2023-07-14</div>
                      <div>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">Revoke</Button>
                        <Button variant="ghost" size="sm">Rotate</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Settings Management Component
function SettingsManagement() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure global system parameters and service settings
            </CardDescription>
          </div>
          <Button variant="outline" className="flex items-center gap-1">
            <Settings size={16} /> Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="backups">Backups & Maintenance</TabsTrigger>
            <TabsTrigger value="billing">Billing & Quotas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">System Name</label>
                    <input
                      type="text"
                      defaultValue="Smart Health Hub"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Administrator Email</label>
                    <input
                      type="email"
                      defaultValue="admin@smarthealth.hub"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Default Time Zone</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>UTC</option>
                      <option>America/New_York</option>
                      <option>America/Chicago</option>
                      <option>America/Denver</option>
                      <option>America/Los_Angeles</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">System Mode</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>Production</option>
                      <option>Staging</option>
                      <option>Development</option>
                      <option>Maintenance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      defaultValue="30"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Enable Audit Logging</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Allow New Registrations</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Email Notifications</h3>
                  
                  <div>
                    <label className="text-sm font-medium">SMTP Server</label>
                    <input
                      type="text"
                      defaultValue="smtp.example.com"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">SMTP Port</label>
                    <input
                      type="number"
                      defaultValue="587"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Sender Email</label>
                    <input
                      type="email"
                      defaultValue="no-reply@smarthealth.hub"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Settings</h3>
                  
                  <div>
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Send System Alerts</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Send Security Notifications</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Send User Registration Alerts</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" />
                      <span className="ml-2">Send Usage Reports</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="backups">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Automated Backups</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Backup Frequency</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Retention Period (days)</label>
                    <input
                      type="number"
                      defaultValue="30"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Backup Storage Location</label>
                    <input
                      type="text"
                      defaultValue="s3://smarthealth-backups/"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <Button className="mt-2">Run Manual Backup</Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Maintenance Window</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Day of Week</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>Sunday</option>
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option>Friday</option>
                      <option>Saturday</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Start Time (UTC)</label>
                    <input
                      type="time"
                      defaultValue="02:00"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Duration (hours)</label>
                    <input
                      type="number"
                      defaultValue="2"
                      min="1"
                      max="8"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Notify users before maintenance</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="billing">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Billing Information</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Billing Contact</label>
                    <input
                      type="text"
                      defaultValue="Finance Department"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Billing Email</label>
                    <input
                      type="email"
                      defaultValue="billing@smarthealth.hub"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Current Plan</label>
                    <select className="w-full mt-1 p-2 border rounded-md">
                      <option>Enterprise</option>
                      <option>Professional</option>
                      <option>Standard</option>
                    </select>
                  </div>
                  
                  <Button className="flex items-center gap-1">
                    <CreditCard size={16} /> Manage Payment Methods
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Usage Quotas</h3>
                  
                  <div>
                    <label className="text-sm font-medium">API Rate Limit (requests/minute)</label>
                    <input
                      type="number"
                      defaultValue="1000"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Maximum Users</label>
                    <input
                      type="number"
                      defaultValue="1500"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Storage Quota (GB)</label>
                    <input
                      type="number"
                      defaultValue="1000"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="ml-2">Send usage alerts at 80% of quota</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function AdminPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  return (
    <LayoutWithSidebar>
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start rounded-xl p-1 bg-muted/50">
          <TabsTrigger value="dashboard" className="flex h-10 items-center gap-1 rounded-lg px-4 text-center">
            <BarChart3 size={16} />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex h-10 items-center gap-1 rounded-lg px-4 text-center">
            <Users size={16} />
            <span>User Management</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex h-10 items-center gap-1 rounded-lg px-4 text-center">
            <Shield size={16} />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex h-10 items-center gap-1 rounded-lg px-4 text-center">
            <Settings size={16} />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <Dashboard />
        </TabsContent>
        
        <TabsContent value="users">
          <UsersManagement />
        </TabsContent>
        
        <TabsContent value="security">
          <SecurityManagement />
        </TabsContent>
        
        <TabsContent value="settings">
          <SettingsManagement />
        </TabsContent>
      </Tabs>
    </LayoutWithSidebar>
  );
}