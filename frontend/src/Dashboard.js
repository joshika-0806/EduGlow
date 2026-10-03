import React, { useState, useMemo } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Grid, Box,
  TextField, Select, MenuItem, FormControl, InputLabel, Button
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const SummaryCard = ({ title, value, color }) => (
  <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: color, color: '#fff' }}>
    <Typography component="h2" variant="h6" gutterBottom>{title}</Typography>
    <Typography component="p" variant="h4">{value}</Typography>
  </Paper>
);

// We now accept the 'data' prop and give it a default value of an empty array []
function Dashboard({ data = [], onStudentSelect }) {
  
  // --- All hooks are now at the top, before any returns ---
  const [nameFilter, setNameFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

  const filteredData = useMemo(() => {
    return data.filter(student => {
      const nameMatch = student.Name.toLowerCase().includes(nameFilter.toLowerCase());
      const departmentMatch = departmentFilter === 'All' || student.Department === departmentFilter;
      const riskMatch = riskFilter === 'All' || 
                        (riskFilter === 'High Risk' && student.RiskPrediction === 1) || 
                        (riskFilter === 'Not At Risk' && student.RiskPrediction === 0);
      return nameMatch && departmentMatch && riskMatch;
    });
  }, [data, nameFilter, departmentFilter, riskFilter]);

  // Now we can check for data after all hooks have been called
  if (!data || data.length === 0) {
    return <Container><Typography variant="h5" sx={{ mt: 5 }}>Dashboard is empty. Please process data first.</Typography></Container>;
  }

  const totalStudents = filteredData.length;
  const highRiskStudents = filteredData.filter(student => student.RiskPrediction === 1).length;
  const safeStudents = totalStudents - highRiskStudents;

  const handleDownloadCsv = () => {
    // ... (download logic remains the same)
    const headers = ['StudentID', 'Name', 'Department', 'AttendancePercentage', 'AverageMarks', 'RiskStatus'];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(student => [
        student.StudentID,
        student.Name.replace(/,/g, ''),
        student.Department,
        student.AttendancePercentage.toFixed(2),
        student.AverageMarks.toFixed(2),
        student.RiskPrediction === 1 ? 'High Risk' : 'Not At Risk'
      ].join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'student_risk_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const departments = ['All', ...new Set(data.map(item => item.Department))];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography component="h1" variant="h4" color="primary" gutterBottom>Mentor's Dashboard</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}><SummaryCard title="Displayed Students" value={totalStudents} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={4}><SummaryCard title="High Risk" value={highRiskStudents} color="#d32f2f" /></Grid>
        <Grid item xs={12} sm={4}><SummaryCard title="Safe" value={safeStudents} color="#388e3c" /></Grid>
      </Grid>
      
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}><TextField fullWidth label="Search by Name" variant="outlined" value={nameFilter} onChange={e => setNameFilter(e.target.value)} /></Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select value={departmentFilter} label="Department" onChange={e => setDepartmentFilter(e.target.value)}>
                {departments.map(dept => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Risk Status</InputLabel>
              <Select value={riskFilter} label="Risk Status" onChange={e => setRiskFilter(e.target.value)}>
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="High Risk">High Risk</MenuItem>
                <MenuItem value="Not At Risk">Not At Risk</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={handleDownloadCsv} sx={{ height: '56px' }}>
              Download
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Student ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Attendance (%)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Average Marks</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Risk Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((student) => (
              <TableRow key={student.StudentID} onClick={() => onStudentSelect(student.StudentID)}
                sx={{ backgroundColor: student.RiskPrediction === 1 ? '#ffebee' : 'inherit', '&:hover': { backgroundColor: '#eeeeee', cursor: 'pointer' } }}
              >
                <TableCell>{student.StudentID}</TableCell>
                <TableCell>{student.Name}</TableCell>
                <TableCell>{student.Department}</TableCell>
                <TableCell>{student.AttendancePercentage.toFixed(2)}</TableCell>
                <TableCell>{student.AverageMarks.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ color: student.RiskPrediction === 1 ? '#d32f2f' : '#388e3c', fontWeight: 'bold' }}>
                    {student.RiskPrediction === 1 ? 'High Risk' : 'Not At Risk'}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Dashboard;