document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateReported').value = today;
    
    // Load existing CVEs
    fetchCVEs();
    
    // Handle form submission
    document.getElementById('cve-form').addEventListener('submit', addCVE);
  });
  
  async function fetchCVEs() {
    try {
      const response = await fetch('/api/cves');
      if (!response.ok) {
        throw new Error('Failed to fetch CVEs');
      }
      
      const cves = await response.json();
      displayCVEs(cves);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load CVEs. Please try again.');
    }
  }
  
  function displayCVEs(cves) {
    const cveList = document.getElementById('cve-list');
    cveList.innerHTML = '';
    
    if (cves.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="5" style="text-align: center;">No CVEs added yet</td>';
      cveList.appendChild(row);
      return;
    }
    
    cves.forEach(cve => {
      const row = document.createElement('tr');
      
      // Format date if it exists
      let formattedDate = 'N/A';
      if (cve.dateReported) {
        formattedDate = new Date(cve.dateReported).toLocaleDateString();
      }
      
      row.innerHTML = `
        <td>${cve.cveId}</td>
        <td>${cve.description}</td>
        <td class="severity-${cve.severity}">${cve.severity}</td>
        <td>${formattedDate}</td>
        <td><button class="delete-btn" data-cve-id="${cve.cveId}">Delete</button></td>
      `;
      
      cveList.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', deleteCVE);
    });
  }
  
  async function addCVE(e) {
    e.preventDefault();
    
    const cveData = {
      cveId: document.getElementById('cveId').value,
      description: document.getElementById('description').value,
      severity: document.getElementById('severity').value,
      dateReported: document.getElementById('dateReported').value
    };
    
    try {
      const response = await fetch('/api/cves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cveData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add CVE');
      }
      
      // Reset form
      document.getElementById('cve-form').reset();
      document.getElementById('dateReported').value = new Date().toISOString().split('T')[0];
      
      // Refresh CVE list
      fetchCVEs();
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  }
  
  async function deleteCVE() {
    const cveId = this.getAttribute('data-cve-id');
    
    if (confirm(`Are you sure you want to delete ${cveId}?`)) {
      try {
        const response = await fetch(`/api/cves/${cveId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete CVE');
        }
        
        // Refresh CVE list
        fetchCVEs();
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete CVE. Please try again.');
      }
    }
  }