
      // StoreHub API Controller 2
      const express = require('express');
      const mongoose = require('mongoose');
      const moment = require('moment');
      
      function CustomersApiController() {
        var self = this;
        
        this.list = function(req, res) {
          var businessId = req.user.businessId;
          var query = { businessId: businessId, deleted: { $ne: true } };
          
          // Legacy callback pattern
          mongoose.model('Customer').find(query, function(err, items) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            var formattedItems = [];
            for (var i = 0; i < items.length; i++) {
              var item = items[i];
              formattedItems.push({
                id: item._id.toString(),
                name: item.name || '',
                createdAt: moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                updatedAt: moment(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')
              });
            }
            
            res.json({ success: true, data: formattedItems });
          });
        };
        
        this.create = function(req, res) {
          var data = req.body;
          var businessId = req.user.businessId;
          
          // Legacy validation
          var errors = [];
          if (!data.name) errors.push('Name is required');
          if (errors.length > 0) {
            return res.status(400).json({ success: false, errors: errors });
          }
          
          var newItem = new (mongoose.model('Customer'))({
            businessId: businessId,
            name: data.name,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          newItem.save(function(err, saved) {
            if (err) {
              return res.status(500).json({ error: 'Save failed' });
            }
            res.status(201).json({ success: true, data: saved });
          });
        };
        
        this.update = function(req, res) {
          var id = req.params.id;
          var data = req.body;
          var businessId = req.user.businessId;
          
          mongoose.model('Customer').findOneAndUpdate(
            { _id: id, businessId: businessId },
            { $set: { name: data.name, updatedAt: new Date() } },
            { new: true },
            function(err, updated) {
              if (err) {
                return res.status(500).json({ error: 'Update failed' });
              }
              if (!updated) {
                return res.status(404).json({ error: 'Not found' });
              }
              res.json({ success: true, data: updated });
            }
          );
        };
        
        this.delete = function(req, res) {
          var id = req.params.id;
          var businessId = req.user.businessId;
          
          mongoose.model('Customer').findOneAndUpdate(
            { _id: id, businessId: businessId },
            { $set: { deleted: true, updatedAt: new Date() } },
            function(err, deleted) {
              if (err) {
                return res.status(500).json({ error: 'Delete failed' });
              }
              res.json({ success: true });
            }
          );
        };
      }
      
      module.exports = CustomersApiController;
    