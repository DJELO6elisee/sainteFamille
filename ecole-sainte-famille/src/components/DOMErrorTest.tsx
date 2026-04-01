import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Alert, Paper, Stack, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SafeDialog from './SafeDialog';

/**
 * Test component to simulate DOM manipulation errors
 * This component tests rapid navigation and async operations
 */
const DOMErrorTest = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [domErrors, setDomErrors] = useState<string[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [isMounted, setIsMounted] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Test 1: Simulate async operation with rapid navigation
  useEffect(() => {
    let isMounted = true;
    
    const simulateAsyncOperation = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      
      try {
        // Simulate API call with delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!isMounted) return;
        setData({ message: 'Test data loaded successfully' });
        setTestResults(prev => [...prev, '✅ Test 1: Async operation completed']);
      } catch (err) {
        if (isMounted) {
          setError('Test error occurred');
          setTestResults(prev => [...prev, '❌ Test 1: Async operation failed']);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    simulateAsyncOperation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Test 2: Monitor DOM errors in real-time
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (errorMessage.includes('removeChild') || errorMessage.includes('Node')) {
        const timestamp = new Date().toLocaleTimeString();
        const newError = `❌ DOM Error [${timestamp}]: ${errorMessage.substring(0, 150)}...`;
        setDomErrors(prev => [...prev, newError]);
        setErrorCount(prev => prev + 1);
        setTestResults(prev => [...prev, `❌ DOM Error detected at ${timestamp}`]);
      }
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      const warnMessage = args.join(' ');
      if (warnMessage.includes('removeChild') || warnMessage.includes('Node')) {
        const timestamp = new Date().toLocaleTimeString();
        const newWarning = `⚠️ DOM Warning [${timestamp}]: ${warnMessage.substring(0, 150)}...`;
        setDomErrors(prev => [...prev, newWarning]);
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Test 3: Test SafeDialog
  const handleTestDialog = () => {
    setTestResults(prev => [...prev, '🔄 Test 3: Testing SafeDialog...']);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setTestResults(prev => [...prev, '✅ Test 3: SafeDialog test completed']);
  };

  // Test 4: Simulate rapid navigation
  const handleRapidNavigation = () => {
    setTestResults(prev => [...prev, '🔄 Test 4: Starting rapid navigation test...']);
    
    // Simulate rapid navigation
    const navigatePaths = ['/student/dashboard', '/secretary/students', '/teacher/dashboard'];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < navigatePaths.length) {
        setTestResults(prev => [...prev, `🔄 Navigating to: ${navigatePaths[currentIndex]}`]);
        navigate(navigatePaths[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTestResults(prev => [...prev, '✅ Test 4: Rapid navigation completed']);
      }
    }, 500);
  };

  // Test 5: Test finalize registration simulation
  const handleFinalizeTest = () => {
    setTestResults(prev => [...prev, '🔄 Test 5: Starting finalize registration test...']);
    
    // Simulate the finalize registration process
    const simulateFinalize = async () => {
      try {
        setLoading(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (isMounted) {
          setData({ 
            message: 'Registration finalized successfully',
            student_code: 'TEST123',
            parent_code: 'PARENT456'
          });
          setTestResults(prev => [...prev, '✅ Test 5: Finalize registration completed']);
        }
      } catch (err) {
        if (isMounted) {
          setError('Finalize registration failed');
          setTestResults(prev => [...prev, '❌ Test 5: Finalize registration failed']);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    simulateFinalize();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleClearResults = () => {
    setTestResults([]);
    setDomErrors([]);
    setErrorCount(0);
  };

  const handleNavigateToFinalize = () => {
    navigate('/finalize-registration');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🧪 Test des Erreurs DOM
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Ce composant teste les erreurs DOM et les problèmes de cleanup des composants React.
      </Alert>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={handleTestDialog}
          disabled={loading}
        >
          Test SafeDialog
        </Button>
        <Button 
          variant="contained" 
          onClick={handleRapidNavigation}
          disabled={loading}
        >
          Test Navigation Rapide
        </Button>
        <Button 
          variant="contained" 
          onClick={handleFinalizeTest}
          disabled={loading}
        >
          Test Finalisation
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleNavigateToFinalize}
        >
          Aller à Finalisation
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleClearResults}
        >
          Effacer Résultats
        </Button>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography>Test en cours...</Typography>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {/* Test Results */}
        <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Résultats des Tests ({testResults.length})
          </Typography>
          <List dense>
            {testResults.map((result, index) => (
              <ListItem key={index}>
                <ListItemText 
                  primary={result}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* DOM Errors */}
        <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Erreurs DOM ({errorCount})
          </Typography>
          {domErrors.length === 0 ? (
            <Typography color="success.main">
              ✅ Aucune erreur DOM détectée
            </Typography>
          ) : (
            <List dense>
              {domErrors.map((error, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={error}
                    sx={{ 
                      '& .MuiListItemText-primary': {
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: 'error.main'
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {data && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Données de Test
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
            {JSON.stringify(data, null, 2)}
          </Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Test SafeDialog */}
      <SafeDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Test SafeDialog"
        actions={
          <>
            <Button onClick={handleDialogClose}>Fermer</Button>
            <Button variant="contained" onClick={handleDialogClose}>
              Confirmer
            </Button>
          </>
        }
      >
        <Typography>
          Ceci est un test du composant SafeDialog pour vérifier qu'il n'y a pas d'erreurs DOM.
        </Typography>
      </SafeDialog>
    </Box>
  );
};

export default DOMErrorTest; 
