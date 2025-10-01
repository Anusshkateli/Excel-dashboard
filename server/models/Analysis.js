const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  chartType: {
    type: String,
    enum: ['bar', 'line', 'pie', 'scatter', 'area'],
    required: true
  },
  xAxis: {
    column: String,
    label: String
  },
  yAxis: {
    column: String,
    label: String
  },
  chartConfig: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  chartData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  insights: {
    statistics: {
      mean: Number,
      median: Number,
      mode: mongoose.Schema.Types.Mixed,
      range: Number,
      standardDeviation: Number
    }
  },
  downloadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Analysis', analysisSchema);