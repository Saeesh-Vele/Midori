import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Mic, MicOff, Volume2, VolumeX, Brain, Zap, Clock, TrendingUp,
  Play, Pause, Square, RefreshCw, Download, MessageSquare, Sparkles,
  MapPin, Activity, Thermometer, Cpu
} from 'lucide-react';

interface VoiceQuery {
  id: string;
  voice_input: string;
  ai_response: any;
  timestamp: string;
  chart_data?: any;
}

interface ChartData {
  type: string;
  title: string;
  data: any[];
}

const VoiceAIAssistant: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queries, setQueries] = useState<VoiceQuery[]>([]);
  const [currentChart, setCurrentChart] = useState<ChartData | null>(null);
  const [voiceInput, setVoiceInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Web Speech API references
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceInput(transcript);
        processVoiceQuery(transcript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Voice recognition failed. Please try again.');
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);
  
  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      setVoiceInput('');
      recognitionRef.current.start();
      toast.info('🎤 Listening... Speak your query about device optimization');
    } else {
      toast.error('Speech recognition not supported in this browser');
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };
  
  const processVoiceQuery = async (text: string) => {
    setIsProcessing(true);
    
    try {
      // Get recent raw data for specific device queries
      const dataResponse = await fetch('http://localhost:5001/api/iot/database/recent-data?limit=200');
      const dataResult = await dataResponse.json();
      
      // Also get ML recommendations
      const mlResponse = await fetch('http://localhost:5001/api/iot/ai/device-recommendations?limit=50');
      const mlResult = await mlResponse.json();
      
      if (dataResult.success && dataResult.data) {
        // Process the query locally based on keywords
        const queryLower = text.toLowerCase();
        let chartData: ChartData | null = null;
        let responseText = '';
        
        // Enhanced flexible query parsing - works with almost any voice input
        const sensorTypeMap = {
          'temperature': ['temperature', 'temp', 'hot', 'heat', 'thermal', 'degrees', 'celsius'],
          'cpu_usage': ['cpu', 'processor', 'processing', 'computation', 'compute', 'usage'],
          'memory_usage': ['memory', 'ram', 'storage', 'mem'],
          'power_consumption': ['power', 'energy', 'consumption', 'electricity', 'watt', 'watts'],
          'network_io': ['network', 'internet', 'connection', 'bandwidth', 'traffic'],
          'disk_io': ['disk', 'storage', 'drive', 'hard drive', 'ssd']
        };
        
        const conditionMap = {
          'high': ['high', 'highest', 'maximum', 'max', 'peak', 'top', 'most', 'excessive', 'above'],
          'low': ['low', 'lowest', 'minimum', 'min', 'least', 'small', 'below'],
          'critical': ['critical', 'danger', 'alert', 'warning', 'problem', 'issue', 'emergency'],
          'normal': ['normal', 'good', 'ok', 'fine', 'stable', 'healthy']
        };
        
        // Detect sensor type from query
        let detectedSensorType = null;
        let detectedCondition = 'high'; // default
        
        for (const [sensorType, keywords] of Object.entries(sensorTypeMap)) {
          if (keywords.some(keyword => queryLower.includes(keyword))) {
            detectedSensorType = sensorType;
            break;
          }
        }
        
        // Detect condition from query
        for (const [condition, keywords] of Object.entries(conditionMap)) {
          if (keywords.some(keyword => queryLower.includes(keyword))) {
            detectedCondition = condition;
            break;
          }
        }
        
        // Check if user wants device names/list
        const wantsDeviceNames = queryLower.includes('names') || queryLower.includes('exact') || 
                                queryLower.includes('which') || queryLower.includes('show me') ||
                                queryLower.includes('list') || queryLower.includes('devices') ||
                                queryLower.includes('give me');
        
        if (detectedSensorType && wantsDeviceNames) {
          // Get devices for specific sensor type and condition
          let filteredDevices = dataResult.data.filter((device: any) => device.sensor_type === detectedSensorType);
          
          // Sort based on condition
          if (detectedCondition === 'high') {
            filteredDevices = filteredDevices.sort((a: any, b: any) => b.value - a.value);
          } else if (detectedCondition === 'low') {
            filteredDevices = filteredDevices.sort((a: any, b: any) => a.value - b.value);
          } else if (detectedCondition === 'critical') {
            filteredDevices = filteredDevices.filter((device: any) => device.safety_level === 'CRITICAL' || device.safety_level === 'WARNING');
          } else if (detectedCondition === 'normal') {
            filteredDevices = filteredDevices.filter((device: any) => device.safety_level === 'NORMAL');
          }
          
          filteredDevices = filteredDevices.slice(0, 10);
          
          const sensorDisplayName = detectedSensorType.replace('_', ' ').toUpperCase();
          const conditionDisplayName = detectedCondition.toUpperCase();
          
          chartData = {
            type: `${detectedSensorType}_analysis`,
            title: `Devices with ${conditionDisplayName} ${sensorDisplayName}`,
            data: filteredDevices.map((device: any) => ({
              device_id: device.device_id,
              value: device.value,
              zone: device.zone,
              safety_level: device.safety_level,
              unit: device.unit
            }))
          };
          
          const getUnitDisplay = (sensorType: string, unit: string) => {
            switch(sensorType) {
              case 'temperature': return unit || '°C';
              case 'cpu_usage': 
              case 'memory_usage': return '%';
              case 'power_consumption': return 'W';
              case 'network_io':
              case 'disk_io': return 'MB/s';
              default: return unit || '';
            }
          };
          
          responseText = `🔍 IoT Devices with ${conditionDisplayName} ${sensorDisplayName}:

${filteredDevices.slice(0, 5).map((device: any, index: number) => 
  `${index + 1}. **${device.device_id}**
   • ${sensorDisplayName}: ${device.value}${getUnitDisplay(detectedSensorType, device.unit)}
   • Zone: ${device.zone}
   • Safety Level: ${device.safety_level}
   • Timestamp: ${new Date(device.timestamp).toLocaleTimeString()}`
).join('\n\n')}

📊 Found ${filteredDevices.length} ${detectedSensorType.replace('_', ' ')} sensors. ${detectedCondition === 'high' ? 'Highest' : detectedCondition === 'low' ? 'Lowest' : 'Filtered'} value is ${filteredDevices[0]?.value}${getUnitDisplay(detectedSensorType, filteredDevices[0]?.unit)} from device ${filteredDevices[0]?.device_id}.`;
          
        } else if (queryLower.includes('energy') || queryLower.includes('consumption') || queryLower.includes('minimum')) {
          // Energy optimization query
          if (mlResult.success && mlResult.recommendations) {
            const energyData = mlResult.recommendations
              .sort((a: any, b: any) => a.predicted_energy - b.predicted_energy)
              .slice(0, 5)
              .map((device: any) => ({
                device_id: device.device_id,
                sensor_type: device.sensor_type,
                zone: device.zone,
                energy_consumption: Math.round(device.predicted_energy * 100) / 100,
                efficiency_score: device.efficiency_score,
                status: device.status
              }));
            
            chartData = {
              type: 'energy_optimization',
              title: 'Most Energy Efficient Devices',
              data: energyData
            };
            
            responseText = `Based on real-time analysis, here are the most energy-efficient devices:

🏆 Top Device: ${energyData[0].device_id} (${energyData[0].sensor_type})
   • Zone: ${energyData[0].zone}
   • Energy: ${energyData[0].energy_consumption} units
   • Efficiency: ${energyData[0].efficiency_score}%

💡 These ${energyData.length} devices consume the least energy and are recommended for continuous operation.`;
          }
        } else {
          // General overview
          const totalDevices = dataResult.data.length;
          const recentDevices = dataResult.data.slice(0, 10);
          
          chartData = {
            type: 'device_list',
            title: 'Recent IoT Devices',
            data: recentDevices.map((device: any) => ({
              device_id: device.device_id,
              sensor_type: device.sensor_type,
              value: device.value,
              zone: device.zone
            }))
          };
          
          responseText = `📋 Recent IoT Device Names:

${recentDevices.slice(0, 5).map((device: any, index: number) => 
  `${index + 1}. **${device.device_id}**
   • Type: ${device.sensor_type}
   • Value: ${device.value}${device.unit}
   • Zone: ${device.zone}
   • Status: ${device.safety_level}`
).join('\n\n')}

📊 Showing ${recentDevices.length} most recent devices from your real-time database with ${totalDevices} total records.`;
        }
        
        const newQuery: VoiceQuery = {
          id: Date.now().toString(),
          voice_input: text,
          ai_response: {
            success: true,
            intent: 'processed',
            response: responseText,
            chart_data: chartData
          },
          timestamp: new Date().toLocaleString(),
          chart_data: chartData
        };
        
        setQueries(prev => [newQuery, ...prev]);
        setCurrentChart(chartData);
        
        // Speak the AI response
        speakResponse(responseText);
        
        toast.success('🤖 AI analysis complete!');
      } else {
        toast.error('No real-time data available for analysis');
      }
    } catch (error) {
      console.error('Error processing voice query:', error);
      toast.error('Error connecting to database');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const speakResponse = (text: string) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  };
  
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };
  
  const processTextQuery = () => {
    if (voiceInput.trim()) {
      processVoiceQuery(voiceInput.trim());
    }
  };
  
  const renderChart = (chartData: ChartData) => {
    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5A2B'];
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="device_id" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
          />
          <Bar dataKey="value" fill="#8B5CF6" name="Value" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  const exportQueryResults = () => {
    if (!queries.length) {
      toast.error('No queries to export');
      return;
    }
    
    const csvContent = [
      ['Timestamp', 'Voice_Input', 'AI_Response', 'Intent', 'Success'].join(','),
      ...queries.map(query => [
        query.timestamp,
        `"${query.voice_input}"`,
        `"${query.ai_response.response?.substring(0, 100) || 'N/A'}..."`,
        query.ai_response.intent || 'general',
        query.ai_response.success ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice_ai_queries_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success(`📊 Exported ${queries.length} voice queries`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-slate-800/50 border-purple-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-400" />
                <div>
                  <CardTitle className="text-2xl text-purple-300">Universal Voice AI Assistant</CardTitle>
                  <p className="text-slate-400">Ask about ANY sensor parameter - temperature, CPU, memory, power, network, disk</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-green-500/30 text-green-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Smart Query Parser
                </Badge>
                
                <Button
                  onClick={exportQueryResults}
                  disabled={!queries.length}
                  variant="outline"
                  className="border-blue-500/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Queries
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Voice Input Controls */}
        <Card className="bg-slate-800/50 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300">Universal Voice Command Center</CardTitle>
            <p className="text-slate-400">Try: "Show me devices with high temperature" or "Which devices have low CPU usage"</p>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Voice Input */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={voiceInput}
                  onChange={(e) => setVoiceInput(e.target.value)}
                  placeholder="Ask about any sensor: temperature, CPU, memory, power, network, disk..."
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/30 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                  onKeyPress={(e) => e.key === 'Enter' && processTextQuery()}
                />
              </div>
              
              <Button
                onClick={processTextQuery}
                disabled={!voiceInput.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask AI
              </Button>
            </div>
            
            {/* Voice Controls */}
            <div className="flex items-center justify-center gap-6">
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                    : 'bg-green-600 hover:bg-green-700'
                } px-8 py-4 text-lg`}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-6 w-6 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6 mr-2" />
                    Start Voice Input
                  </>
                )}
              </Button>
              
              <Button
                onClick={isSpeaking ? stopSpeaking : () => {}}
                disabled={!isSpeaking}
                variant="outline"
                className="border-orange-500/30"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Stop Speaking
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    AI Voice Ready
                  </>
                )}
              </Button>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-slate-300">
                  {isListening ? 'Listening...' : 'Voice Input Ready'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-slate-300">
                  {isProcessing ? 'AI Processing...' : 'AI Ready'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-slate-300">
                  {isSpeaking ? 'AI Speaking...' : 'Voice Output Ready'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Chart Visualization */}
        {currentChart && (
          <Card className="bg-slate-800/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-300">{currentChart.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(currentChart)}
            </CardContent>
          </Card>
        )}

        {/* Query History */}
        <Card className="bg-slate-800/50 border-slate-500/20">
          <CardHeader>
            <CardTitle className="text-slate-300">Voice Query History</CardTitle>
            <p className="text-slate-400">Recent AI-powered device optimization insights</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {queries.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">No voice queries yet. Try these universal examples:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
                      <Button
                        onClick={() => processVoiceQuery("Show me devices with high temperature")}
                        variant="outline"
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        disabled={isProcessing}
                      >
                        <Thermometer className="h-4 w-4 mr-2" />
                        High Temperature
                      </Button>
                      
                      <Button
                        onClick={() => processVoiceQuery("Which devices have low CPU usage")}
                        variant="outline"
                        className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                        disabled={isProcessing}
                      >
                        <Cpu className="h-4 w-4 mr-2" />
                        Low CPU Usage
                      </Button>
                      
                      <Button
                        onClick={() => processVoiceQuery("Give me devices with maximum power consumption")}
                        variant="outline"
                        className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                        disabled={isProcessing}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Max Power
                      </Button>
                      
                      <Button
                        onClick={() => processVoiceQuery("Show me devices with minimum memory usage")}
                        variant="outline"
                        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                        disabled={isProcessing}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Min Memory
                      </Button>
                      
                      <Button
                        onClick={() => processVoiceQuery("Which devices have critical network issues")}
                        variant="outline"
                        className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                        disabled={isProcessing}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Critical Network
                      </Button>
                      
                      <Button
                        onClick={() => processVoiceQuery("Show me all device names")}
                        variant="outline"
                        className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                        disabled={isProcessing}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        All Devices
                      </Button>
                    </div>
                  </div>
                ) : (
                  queries.map((query) => (
                    <div key={query.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-slate-400">{query.timestamp}</span>
                        </div>
                        <Badge 
                          className="bg-green-600"
                        >
                          {query.ai_response.intent || 'general'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-slate-400 mb-1">🗣️ Voice Input:</p>
                          <p className="text-slate-200 italic">"{query.voice_input}"</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-slate-400 mb-1">🤖 AI Response:</p>
                          <div className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-800/50 p-3 rounded border border-slate-600/20">
                            {query.ai_response.response}
                          </div>
                        </div>
                        
                        {query.chart_data && (
                          <Button
                            onClick={() => setCurrentChart(query.chart_data)}
                            size="sm"
                            variant="outline"
                            className="border-purple-500/30"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            View Chart
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default VoiceAIAssistant;
