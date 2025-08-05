
      // StoreHub Data Model 1
      var mongoose = require('mongoose');
      
      var OrderSchema = new mongoose.Schema({
        businessId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        category: { type: String, default: 'general' },
        tags: [{ type: String }],
        metadata: {
          createdBy: { type: mongoose.Schema.Types.ObjectId },
          updatedBy: { type: mongoose.Schema.Types.ObjectId },
          version: { type: Number, default: 1 }
        },
        status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
        settings: {
          isPublic: { type: Boolean, default: false },
          allowComments: { type: Boolean, default: true },
          priority: { type: Number, default: 0 }
        },
        statistics: {
          viewCount: { type: Number, default: 0 },
          likeCount: { type: Number, default: 0 },
          shareCount: { type: Number, default: 0 }
        },
        deleted: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });
      
      // Legacy instance methods
      OrderSchema.methods.toPublicJSON = function() {
        var obj = this.toObject();
        delete obj.deleted;
        delete obj.__v;
        return obj;
      };
      
      OrderSchema.methods.incrementViewCount = function(callback) {
        this.statistics.viewCount += 1;
        this.save(callback);
      };
      
      OrderSchema.methods.addTag = function(tag, callback) {
        if (this.tags.indexOf(tag) === -1) {
          this.tags.push(tag);
          this.save(callback);
        } else {
          callback(null, this);
        }
      };
      
      // Legacy static methods
      OrderSchema.statics.findByBusinessId = function(businessId, callback) {
        return this.find({ businessId: businessId, deleted: false }, callback);
      };
      
      OrderSchema.statics.findActiveByCategory = function(businessId, category, callback) {
        return this.find({
          businessId: businessId,
          category: category,
          status: 'active',
          deleted: false
        }, callback);
      };
      
      // Legacy pre-save middleware
      OrderSchema.pre('save', function(next) {
        this.updatedAt = new Date();
        next();
      });
      
      module.exports = mongoose.model('Order', OrderSchema);
    