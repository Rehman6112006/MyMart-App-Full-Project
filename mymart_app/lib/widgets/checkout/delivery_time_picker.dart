import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../models/order.dart';

class DeliveryTimePicker extends StatelessWidget {
  final DeliverySlot selectedSlot;
  final List<DeliverySlot> slots;
  final ValueChanged<DeliverySlot> onSlotSelected;
  final String Function(String) translate;

  const DeliveryTimePicker({
    super.key,
    required this.selectedSlot,
    required this.slots,
    required this.onSlotSelected,
    required this.translate,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Icon(Icons.access_time, color: AppTheme.primary, size: 22),
          const SizedBox(width: 8),
          Text(translate('delivery_time'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        ]),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => _showSlotPicker(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Row(children: [
              Icon(selectedSlot.slotType == 'morning'
                  ? Icons.wb_sunny_outlined
                  : selectedSlot.slotType == 'afternoon'
                      ? Icons.wb_cloudy_outlined
                      : Icons.nightlight_outlined,
                  color: AppTheme.primary, size: 22),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(selectedSlot.slotName, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
                Text(selectedSlot.displayTime, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
              ])),
              const Icon(Icons.keyboard_arrow_down, color: AppTheme.primary),
            ]),
          ),
        ),
      ],
    );
  }

  void _showSlotPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 40, height: 4, decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(children: [
                    const Icon(Icons.access_time, color: AppTheme.primary, size: 22),
                    const SizedBox(width: 8),
                    Text(translate('select_delivery_time'), style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  ]),
                ),
                const SizedBox(height: 16),
                ...slots.map((slot) {
                  final isSelected = selectedSlot.id == slot.id;
                  return GestureDetector(
                    onTap: () {
                      onSlotSelected(slot);
                      Navigator.pop(ctx);
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.primaryExtraLight : AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: isSelected ? Border.all(color: AppTheme.primary, width: 2) : Border.all(color: AppTheme.divider),
                      ),
                      child: Row(children: [
                        Icon(slot.slotType == 'morning' ? Icons.wb_sunny_outlined : slot.slotType == 'afternoon' ? Icons.wb_cloudy_outlined : Icons.nightlight_outlined, color: AppTheme.primary, size: 24),
                        const SizedBox(width: 14),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(slot.slotName, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text(slot.displayTime, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
                        ])),
                        if (isSelected) Container(padding: const EdgeInsets.all(6), decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle), child: const Icon(Icons.check, color: Colors.white, size: 16)),
                      ]),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }
}
