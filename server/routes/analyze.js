const express = require('express');
const Analysis = require('../models/Analysis');
const Upload = require('../models/Upload');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const calculateStatistics = (data) => {
  if (!data || data.length === 0) return null;
  
  const numbers = data.filter(val => typeof val === 'number' && !isNaN(val));
  if (numbers.length === 0) return null;
  
  const sorted = numbers.sort((a, b) => a - b);
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  const mean = sum / numbers.length;
  
  const median = numbers.length % 2 === 0
    ? (sorted[Math.floor(numbers.length / 2) - 1] + sorted[Math.floor(numbers.length / 2)]) / 2
    : sorted[Math.floor(numbers.length / 2)];
  
  const frequency = {};
  let maxFreq = 0;
  let mode = null;
  
  numbers.forEach(num => {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
      mode = num;
    }
  });
  
  const range = sorted[sorted.length - 1] - sorted[0];
  
  const squaredDiffs = numbers.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / numbers.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);
  
  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    mode: parseFloat(mode.toFixed(2)),
    range: parseFloat(range.toFixed(2)),
    standardDeviation: parseFloat(standardDeviation.toFixed(2))
  };
};

const processChartData = (data, xAxis, yAxis, chartType) => {
  if (!data || data.length === 0) {
    throw new Error('No data available for chart generation');
  }

  let chartData = {
    labels: [],
    datasets: [{
      label: yAxis.label || yAxis.column,
      data: [],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 1
    }]
  };

  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];

  if (chartType === 'pie') {
    const groupedData = {};
    data.forEach(row => {
      const xValue = row[xAxis.column];
      const yValue = parseFloat(row[yAxis.column]) || 0;
      
      if (groupedData[xValue]) {
        groupedData[xValue] += yValue;
      } else {
        groupedData[xValue] = yValue;
      }
    });

    chartData.labels = Object.keys(groupedData);
    chartData.datasets[0].data = Object.values(groupedData);
    chartData.datasets[0].backgroundColor = chartData.labels.map((_, index) => colors[index % colors.length]);
  } else if (chartType === 'scatter') {
    chartData.datasets[0].data = data.map(row => ({
      x: parseFloat(row[xAxis.column]) || 0,
      y: parseFloat(row[yAxis.column]) || 0
    }));
    chartData.datasets[0].backgroundColor = colors[0];
    chartData.datasets[0].borderColor = colors[0];
  } else {
    const processedData = data.slice(0, 50);
    
    chartData.labels = processedData.map(row => row[xAxis.column]);
    chartData.datasets[0].data = processedData.map(row => parseFloat(row[yAxis.column]) || 0);
    
    if (chartType === 'bar') {
      chartData.datasets[0].backgroundColor = colors[0] + '80';
      chartData.datasets[0].borderColor = colors[0];
    } else if (chartType === 'line' || chartType === 'area') {
      chartData.datasets[0].backgroundColor = chartType === 'area' ? colors[0] + '30' : 'transparent';
      chartData.datasets[0].borderColor = colors[0];
      chartData.datasets[0].fill = chartType === 'area';
      chartData.datasets[0].tension = 0.4;
    }
  }

  return chartData;
};

const generateChartConfig = (chartType, chartData, xAxis, yAxis) => {
  const baseConfig = {
    type: chartType,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `${yAxis.label || yAxis.column} vs ${xAxis.label || xAxis.column}`
        }
      }
    }
  };

  if (chartType === 'pie') {
    baseConfig.options.plugins.legend.position = 'right';
  } else if (chartType === 'scatter') {
    baseConfig.options.scales = {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: xAxis.label || xAxis.column
        }
      },
      y: {
        title: {
          display: true,
          text: yAxis.label || yAxis.column
        }
      }
    };
  } else {
    baseConfig.options.scales = {
      x: {
        title: {
          display: true,
          text: xAxis.label || xAxis.column
        }
      },
      y: {
        title: {
          display: true,
          text: yAxis.label || yAxis.column
        }
      }
    };
  }

  return baseConfig;
};

router.post('/', auth, async (req, res) => {
  try {
    const { uploadId, title, description, chartType, xAxis, yAxis } = req.body;

    if (!uploadId || !title || !chartType || !xAxis || !yAxis) {
      return res.status(400).json({ 
        message: 'Missing required fields: uploadId, title, chartType, xAxis, yAxis' 
      });
    }

    const upload = await Upload.findOne({ _id: uploadId, user: req.user.id });
    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    const validChartTypes = ['bar', 'line', 'pie', 'scatter', 'area'];
    if (!validChartTypes.includes(chartType)) {
      return res.status(400).json({ message: 'Invalid chart type' });
    }

    const columns = upload.columns.map(col => col.name);
    if (!columns.includes(xAxis.column) || !columns.includes(yAxis.column)) {
      return res.status(400).json({ message: 'Invalid axis columns' });
    }

    const chartData = processChartData(upload.data, xAxis, yAxis, chartType);
    const chartConfig = generateChartConfig(chartType, chartData, xAxis, yAxis);

    const yAxisData = upload.data.map(row => parseFloat(row[yAxis.column])).filter(val => !isNaN(val));
    const statistics = calculateStatistics(yAxisData);

    const analysis = new Analysis({
      user: req.user.id,
      upload: uploadId,
      title,
      description: description || '',
      chartType,
      xAxis,
      yAxis,
      chartConfig,
      chartData,
      insights: {
        statistics
      }
    });

    await analysis.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: { analyses: analysis._id }
    });

    res.status(201).json({
      message: 'Analysis created successfully',
      analysis: {
        id: analysis._id,
        title: analysis.title,
        description: analysis.description,
        chartType: analysis.chartType,
        chartConfig: analysis.chartConfig,
        chartData: analysis.chartData,
        insights: analysis.insights,
        createdAt: analysis.createdAt
      }
    });
  } catch (error) {
    console.error('Analysis creation error:', error);
    res.status(500).json({ message: error.message || 'Error creating analysis' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user.id })
      .select('-chartData')
      .populate('upload', 'originalName fileSize createdAt')
      .sort({ createdAt: -1 });

    res.json({ analyses });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ message: 'Error fetching analyses' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('upload', 'originalName columns rowCount');

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json({ analysis });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ message: 'Error fetching analysis' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    await Analysis.findByIdAndDelete(req.params.id);

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { analyses: req.params.id }
    });

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ message: 'Error deleting analysis' });
  }
});

module.exports = router;