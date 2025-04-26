document.addEventListener('DOMContentLoaded', function() {
    const cveForm = document.getElementById('cveForm');
    const cveList = document.getElementById('cveList');

    // Load all CVEs when page loads
    fetchCVEs();

    // Add event listener to form submit
    cveForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const cveData = {
            cveId: document.getElementById('cveId').value,
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            severity: document.getElementById('severity').value,
            status: document.getElementById('status').value,
            dateAdded: new Date().toISOString()
        };

        // Send data to API
        fetch('/api/cves', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cveData),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            fetchCVEs(); // Refresh the list
            cveForm.reset(); // Clear the form
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Failed to add CVE. Please try again.');
        });
    });

    // Function to fetch all CVEs from API
    function fetchCVEs() {
        fetch('/api/cves')
            .then(response => response.json())
            .then(data => {
                displayCVEs(data);
            })
            .catch(error => {
                console.error('Error fetching CVEs:', error);
            });
    }

    // Function to display CVEs in the UI
    function displayCVEs(cves) {
        cveList.innerHTML = '';
        
        if (cves.length === 0) {
            cveList.innerHTML = '<p>No CVEs added yet.</p>';
            return;
        }

        cves.forEach(cve => {
            const card = document.createElement('div');
            card.className = `card cve-card severity-${cve.severity}`;
            
            const dateAdded = new Date(cve.dateAdded).toLocaleDateString();
            
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title">${cve.cveId}: ${cve.title}</h5>
                        <span class="badge bg-${getBadgeClass(cve.severity)}">${cve.severity.toUpperCase()}</span>
                    </div>
                    <h6 class="card-subtitle mb-2 text-muted">Status: ${cve.status} | Added: ${dateAdded}</h6>
                    <p class="card-text">${cve.description}</p>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${cve.cveId}">Delete</button>
                </div>
            `;
            
            cveList.appendChild(card);
            
            // Add delete event listener
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', function() {
                deleteCVE(cve.cveId);
            });
        });
    }

    // Function to delete a CVE
    function deleteCVE(id) {
        if (confirm('Are you sure you want to delete this CVE?')) {
            fetch(`/api/cves/${id}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                console.log('Deleted:', data);
                fetchCVEs(); // Refresh the list
            })
            .catch(error => {
                console.error('Error deleting CVE:', error);
            });
        }
    }

    // Helper function to get appropriate badge class
    function getBadgeClass(severity) {
        switch(severity) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'secondary';
        }
    }
});
