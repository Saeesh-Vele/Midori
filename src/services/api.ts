// API service for connecting frontend to Flask backend
const API_BASE_URL = 'http://localhost:5001';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Data Ingestion APIs
  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/api/ingest/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async getSampleData(datasetName: string): Promise<any> {
    return this.request(`/api/ingest/sample/${datasetName}`);
  }

  async validateData(data: any): Promise<any> {
    return this.request('/api/ingest/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Data Processing APIs
  async processData(config: any): Promise<any> {
    return this.request('/api/process/clean', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async transformData(config: any): Promise<any> {
    return this.request('/api/process/transform', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getProcessingStatus(jobId: string): Promise<any> {
    return this.request(`/api/process/status/${jobId}`);
  }

  // Machine Learning APIs
  async trainModel(config: any): Promise<any> {
    return this.request('/api/process/train', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async predictModel(config: any): Promise<any> {
    return this.request('/api/process/predict', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getModelMetrics(modelId: string): Promise<any> {
    return this.request(`/api/process/metrics/${modelId}`);
  }

  // Pipeline Orchestration APIs
  async runPipeline(config: any): Promise<any> {
    return this.request('/api/pipeline/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getPipelineStatus(pipelineId: string): Promise<any> {
    return this.request(`/api/pipeline/status/${pipelineId}`);
  }

  async getPipelineHistory(): Promise<any> {
    return this.request('/api/pipeline/history');
  }

  // Storage APIs
  async saveData(data: any, tableName: string): Promise<any> {
    return this.request('/api/storage/save', {
      method: 'POST',
      body: JSON.stringify({ data, table_name: tableName }),
    });
  }

  async loadData(tableName: string): Promise<any> {
    return this.request(`/api/storage/load/${tableName}`);
  }

  async listTables(): Promise<any> {
    return this.request('/api/storage/tables');
  }

  // Results and Visualization APIs
  async generateInsights(data: any): Promise<any> {
    return this.request('/api/results/insights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateVisualization(config: any): Promise<any> {
    return this.request('/api/results/visualize', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async exportResults(config: any): Promise<any> {
    return this.request('/api/results/export', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getStatistics(dataId: string): Promise<any> {
    return this.request(`/api/results/stats/${dataId}`);
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/health');
  }

  // Mock data generators for development
  generateMockCustomerData(rows: number = 100): any {
    const data = {
      filename: "mock_customer_data.csv",
      size: rows * 8 * 10, // Approximate size
      headers: ["customer_id", "age", "gender", "annual_income", "spending_score", "purchase_amount", "category", "city"],
      totalRows: rows,
      columns: 8,
      rows: []
    };

    const categories = ["Electronics", "Clothing", "Food", "Books", "Sports"];
    const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"];
    const genders = ["Male", "Female"];

    for (let i = 0; i < rows; i++) {
      data.rows.push({
        customer_id: i + 1,
        age: Math.floor(Math.random() * 50) + 20,
        gender: genders[Math.floor(Math.random() * genders.length)],
        annual_income: Math.floor(Math.random() * 80000) + 20000,
        spending_score: Math.floor(Math.random() * 100) + 1,
        purchase_amount: Math.floor(Math.random() * 2000) + 50,
        category: categories[Math.floor(Math.random() * categories.length)],
        city: cities[Math.floor(Math.random() * cities.length)]
      });
    }

    return data;
  }

  generateMockSalesData(rows: number = 100): any {
    const data = {
      filename: "mock_sales_data.csv",
      size: rows * 12 * 10,
      headers: ["date", "product_id", "category", "sales_amount", "quantity", "region", "salesperson", "discount", "profit", "customer_type", "payment_method", "shipping_cost"],
      totalRows: rows,
      columns: 12,
      rows: []
    };

    const categories = ["Electronics", "Clothing", "Food", "Books", "Sports"];
    const regions = ["North", "South", "East", "West", "Central"];
    const customerTypes = ["Regular", "Premium", "VIP"];
    const paymentMethods = ["Credit Card", "Cash", "PayPal", "Bank Transfer"];

    for (let i = 0; i < rows; i++) {
      const salesAmount = Math.floor(Math.random() * 5000) + 100;
      const discount = Math.random() * 0.3;
      const profit = salesAmount * (0.2 + Math.random() * 0.3);

      data.rows.push({
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        product_id: `P${String(i + 1).padStart(4, '0')}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        sales_amount: salesAmount,
        quantity: Math.floor(Math.random() * 20) + 1,
        region: regions[Math.floor(Math.random() * regions.length)],
        salesperson: `Sales${Math.floor(Math.random() * 10) + 1}`,
        discount: discount.toFixed(2),
        profit: profit.toFixed(2),
        customer_type: customerTypes[Math.floor(Math.random() * customerTypes.length)],
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        shipping_cost: Math.floor(Math.random() * 50) + 5
      });
    }

    return data;
  }

  generateMockIoTData(rows: number = 100): any {
    const data = {
      filename: "mock_iot_data.csv",
      size: rows * 6 * 10,
      headers: ["timestamp", "sensor_id", "temperature", "humidity", "pressure", "vibration"],
      totalRows: rows,
      columns: 6,
      rows: []
    };

    for (let i = 0; i < rows; i++) {
      data.rows.push({
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        sensor_id: `S${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
        temperature: (Math.random() * 40 + 10).toFixed(2),
        humidity: (Math.random() * 100).toFixed(2),
        pressure: (Math.random() * 50 + 950).toFixed(2),
        vibration: (Math.random() * 10).toFixed(2)
      });
    }

    return data;
  }
}

export const apiService = new ApiService();
export default ApiService;
