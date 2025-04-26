import React, { useState, useEffect } from 'react';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  ScanCommand, 
  DeleteCommand, 
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';

// Configure AWS SDK
const REGION = "us-east-1"; // Update with your preferred region
const TABLE_NAME = "CVETracking";

// Create DynamoDB clients
const ddbClient = new DynamoDBClient({ 
  region: REGION, 
  credentials: {
    // You'll need to set up authentication in your deployed environment
    // For local development, you can use environment variables or credentials file
    // For production, use IAM roles when deployed to EC2/Amplify
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  }
});

const documentClient = DynamoDBDocumentClient.from(ddbClient);

const CVETracker = () => {
  // State for storing CVEs and form data
  const [cves, setCves] = useState([]);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    severity: 'Medium',
    dateDiscovered: '',
    status: 'Open',
    affectedSystems: '',
    notes: ''
  });
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('dateDiscovered');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('list');
  const [selectedCve, setSelectedCve] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load CVEs from DynamoDB on component mount
  useEffect(() => {
    fetchCVEs();
  }, []);

  // Function to fetch all CVEs from DynamoDB
  const fetchCVEs = async () => {
    try {
      setIsLoading(true);
      const params = {
        TableName: TABLE_NAME,
      };
      
      const { Items } = await documentClient.send(new ScanCommand(params));
      if (Items) {
        setCves(Items);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching CVEs:", err);
      setError("Failed to load CVEs. Using local storage as fallback.");
      // Fallback to localStorage if DynamoDB fails
      const savedCves = localStorage.getItem('cves');
      if (savedCves) {
        setCves(JSON.parse(savedCves));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save to both DynamoDB and localStorage for redundancy
  useEffect(() => {
    localStorage.setItem('cves', JSON.stringify(cves));
  }, [cves]);

  // Handle form submission to add a new CVE
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.id || !formData.name || !formData.description || !formData.severity) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Check if CVE ID already exists
    if (cves.some(cve => cve.id === formData.id)) {
      alert('A CVE with this ID already exists');
      return;
    }
    
    // Add new CVE
    const newCve = {
      ...formData,
      dateAdded: new Date().toISOString()
    };
    
    try {
      // Save to DynamoDB
      const params = {
        TableName: TABLE_NAME,
        Item: newCve
      };
      
      await documentClient.send(new PutCommand(params));
      
      // Update state
      setCves(prev => [...prev, newCve]);
      setError(null);
      
      // Reset form
      setFormData({
        id: '',
        name: '',
        description: '',
        severity: 'Medium',
        dateDiscovered: '',
        status: 'Open',
        affectedSystems: '',
        notes: ''
      });
      
    } catch (err) {
      console.error("Error adding CVE:", err);
      setError("Failed to save CVE to database. The item was saved locally only.");
      // Still update local state so the user sees their entry
      setCves(prev => [...prev, newCve]);
    }
  };

  // Delete a CVE
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this CVE?')) {
      try {
        // Delete from DynamoDB
        const params = {
          TableName: TABLE_NAME,
          Key: {
            id: id
          }
        };
        
        await documentClient.send(new DeleteCommand(params));
        
        // Update state
        setCves(prev => prev.filter(cve => cve.id !== id));
        
        if (selectedCve && selectedCve.id === id) {
          setSelectedCve(null);
          setViewMode('list');
        }
        
        setError(null);
        
      } catch (err) {
        console.error("Error deleting CVE:", err);
        setError("Failed to delete CVE from database. The view has been updated locally only.");
        // Still update local state so the user sees their action
        setCves(prev => prev.filter(cve => cve.id !== id));
        
        if (selectedCve && selectedCve.id === id) {
          setSelectedCve(null);
          setViewMode('list');
        }
      }
    }
  };

  // Update CVE status
  const handleStatusChange = async (id, newStatus) => {
    try {
      // Update in DynamoDB
      const params = {
        TableName: TABLE_NAME,
        Key: {
          id: id
        },
        UpdateExpression: "set #status = :status",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": newStatus
        },
        ReturnValues: "UPDATED_NEW"
      };
      
      await documentClient.send(new UpdateCommand(params));
      
      // Update state
      setCves(prev => prev.map(cve => 
        cve.id === id ? { ...cve, status: newStatus } : cve
      ));
      
      if (selectedCve && selectedCve.id === id) {
        setSelectedCve(prev => ({ ...prev, status: newStatus }));
      }
      
      setError(null);
      
    } catch (err) {
      console.error("Error updating CVE status:", err);
      setError("Failed to update CVE status in database. The view has been updated locally only.");
      // Still update local state so the user sees their action
      setCves(prev => prev.map(cve => 
        cve.id === id ? { ...cve, status: newStatus } : cve
      ));
      
      if (selectedCve && selectedCve.id === id) {
        setSelectedCve(prev => ({ ...prev, status: newStatus }));
      }
    }
  };

  // View CVE details
  const viewDetails = (cve) => {
    setSelectedCve(cve);
    setViewMode('details');
  };

  // Filter and sort CVEs
  const filteredCves = cves
    .filter(cve => 
      filter === '' || 
      cve.id.toLowerCase().includes(filter.toLowerCase()) ||
      cve.name.toLowerCase().includes(filter.toLowerCase()) ||
      cve.description.toLowerCase().includes(filter.toLowerCase()) ||
      cve.affectedSystems?.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      } else {
        return a[sortBy] < b[sortBy] ? 1 : -1;
      }
    });

  // Generate severity class for styling
  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-blue-400';
      default: return 'bg-gray-300';
    }
  };

  // Get status class for styling
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in progress': return 'bg-yellow-100 text-yellow-800';
      case 'mitigated': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">CVE Tracker</h1>

      {isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex items-center justify-center">
          <div className="text-lg">Loading CVE data...</div>
        </div>
      ) : error ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p className="font-bold">Warning</p>
            <p>{error}</p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {/* Add CVE Form */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New CVE</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVE ID*</label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="e.g., CVE-2023-12345"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Brief name of vulnerability"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity*</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Discovered</label>
                  <input
                    type="date"
                    name="dateDiscovered"
                    value={formData.dateDiscovered}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Mitigated">Mitigated</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affected Systems</label>
                  <input
                    type="text"
                    name="affectedSystems"
                    value={formData.affectedSystems}
                    onChange={handleChange}
                    placeholder="e.g., Windows, Linux, Apache"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Details about the vulnerability"
                    className="w-full p-2 border rounded h-20"
                    required
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional notes or remediation steps"
                    className="w-full p-2 border rounded h-20"
                  ></textarea>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  type="submit" 
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add CVE
                </button>
              </div>
            </form>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Search CVEs..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="id">CVE ID</option>
                  <option value="name">Name</option>
                  <option value="severity">Severity</option>
                  <option value="dateDiscovered">Date Discovered</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* CVE List */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              {filteredCves.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CVE ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCves.map(cve => (
                      <tr key={cve.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cve.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cve.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-md ${getSeverityClass(cve.severity)}`}>
                            {cve.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-md ${getStatusClass(cve.status)}`}>
                            {cve.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => viewDetails(cve)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleDelete(cve.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  {cves.length === 0 ? 
                    "No CVEs added yet. Add your first CVE above." : 
                    "No CVEs match your search criteria."}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* CVE Details View */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">CVE Details</h2>
              <button 
                onClick={() => {
                  setViewMode('list');
                  setSelectedCve(null);
                }}
                className="text-blue-600 hover:underline"
              >
                Back to List
              </button>
            </div>
            
            {selectedCve && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{selectedCve.id}</h3>
                    <p className="text-xl mt-1">{selectedCve.name}</p>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-md ${getSeverityClass(selectedCve.severity)}`}>
                      {selectedCve.severity}
                    </span>
                    <select
                      value={selectedCve.status}
                      onChange={(e) => handleStatusChange(selectedCve.id, e.target.value)}
                      className={`px-3 py-1 text-sm font-semibold rounded-md border ${getStatusClass(selectedCve.status)}`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Mitigated">Mitigated</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date Discovered</h4>
                    <p>{selectedCve.dateDiscovered || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Affected Systems</h4>
                    <p>{selectedCve.affectedSystems || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="mt-1 whitespace-pre-line">{selectedCve.description}</p>
                </div>
                
                {selectedCve.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                    <p className="mt-1 whitespace-pre-line">{selectedCve.notes}</p>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => handleDelete(selectedCve.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete CVE
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* AWS DynamoDB Status Panel */}
      <div className="mt-6 text-sm text-gray-500 text-center">
        <p>Data is being stored in AWS DynamoDB and synchronized locally.</p>
        <p className="text-xs mt-1">Free tier usage: 25GB storage, up to 200M requests/month</p>
      </div>
    </div>
  );
};

// Function to create the DynamoDB table (to be run once during setup)
const createDynamoDBTable = async () => {
  try {
    // Check if using AWS SDK v3
    const { CreateTableCommand } = await import('@aws-sdk/client-dynamodb');
    
    const params = {
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: "id", KeyType: "HASH" } // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5, // Stay well within the free tier of 25 RCUs
        WriteCapacityUnits: 5  // Stay well within the free tier of 25 WCUs
      }
    };
    
    const data = await ddbClient.send(new CreateTableCommand(params));
    console.log("Table created successfully:", data);
    return data;
  } catch (err) {
    // If table already exists or another error
    console.error("Error creating table:", err);
    throw err;
  }
};

export default CVETracker;