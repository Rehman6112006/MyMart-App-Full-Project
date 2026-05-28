import 'package:flutter/material.dart';
import '../models/order.dart';
import '../services/order_service.dart';

class AddressProvider with ChangeNotifier {
  List<DeliveryAddress> _addresses = [];
  bool _isLoading = false;
  String? _error;
  DeliveryAddress? _selectedAddress;

  List<DeliveryAddress> get addresses => _addresses;
  bool get isLoading => _isLoading;
  String? get error => _error;
  DeliveryAddress? get selectedAddress => _selectedAddress ?? defaultAddress;
  
  DeliveryAddress? get defaultAddress {
    try {
      return _addresses.firstWhere((a) => a.isDefault);
    } catch (e) {
      return _addresses.isNotEmpty ? _addresses.first : null;
    }
  }

  Future<void> loadAddresses() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final addresses = await OrderService.getAddresses();
      _addresses = addresses;
    } catch (e) {
      _error = 'Failed to load addresses';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> addAddress(DeliveryAddress address) async {
    try {
      final result = await OrderService.addAddress(address);
      final newAddress = result['address'];
      if (result['success'] == true && newAddress != null && newAddress is DeliveryAddress) {
        _addresses.add(newAddress);
        
        // If this is default, unset others
        if (address.isDefault) {
          for (int i = 0; i < _addresses.length - 1; i++) {
            if (_addresses[i].isDefault) {
              final updated = DeliveryAddress(
                id: _addresses[i].id,
                name: _addresses[i].name,
                phone: _addresses[i].phone,
                addressLine1: _addresses[i].addressLine1,
                addressLine2: _addresses[i].addressLine2,
                city: _addresses[i].city,
                state: _addresses[i].state,
                postalCode: _addresses[i].postalCode,
                landmark: _addresses[i].landmark,
                isDefault: false,
              );
              _addresses[i] = updated;
            }
          }
        }
        
        notifyListeners();
        return true;
      }
      _error = result['error'];
      return false;
    } catch (e) {
      _error = 'Failed to add address';
      return false;
    }
  }

  Future<bool> updateAddress(DeliveryAddress address) async {
    try {
      final success = await OrderService.updateAddress(address.id, address);
      if (success) {
        final index = _addresses.indexWhere((a) => a.id == address.id);
        if (index != -1) {
          _addresses[index] = address;
          
          // If this is default, unset others
          if (address.isDefault) {
            for (int i = 0; i < _addresses.length; i++) {
              if (i != index && _addresses[i].isDefault) {
                final updated = DeliveryAddress(
                  id: _addresses[i].id,
                  name: _addresses[i].name,
                  phone: _addresses[i].phone,
                  addressLine1: _addresses[i].addressLine1,
                  addressLine2: _addresses[i].addressLine2,
                  city: _addresses[i].city,
                  state: _addresses[i].state,
                  postalCode: _addresses[i].postalCode,
                  landmark: _addresses[i].landmark,
                  isDefault: false,
                );
                _addresses[i] = updated;
              }
            }
          }
          
          notifyListeners();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteAddress(String id) async {
    try {
      final success = await OrderService.deleteAddress(id);
      if (success) {
        _addresses.removeWhere((a) => a.id == id);
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void setSelectedAddress(DeliveryAddress address) {
    _selectedAddress = address;
    notifyListeners();
  }

  void clearSelectedAddress() {
    _selectedAddress = null;
    notifyListeners();
  }
}
