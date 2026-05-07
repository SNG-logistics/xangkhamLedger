def cross_check_items(image_data, system_summary):
    """
    Compares extracted image items against the system summary (grouped by category).
    Returns a dictionary of missing items, discrepancies, and matched items.
    """
    discrepancies = []
    missing_in_system = []
    matched = []
    
    # system_summary is {category_name: total_amount}
    # image_data['items'] is [{'category': '...', 'amount_lak': 100}]
    
    # Track which system categories have been checked
    system_checked = set()
    
    # Check image items against system
    if 'items' in image_data:
        for item in image_data['items']:
            cat = item.get('category', 'Unknown')
            amount = float(item.get('amount_lak', 0))
            
            # Simple exact match for now. In a real app, fuzzy matching might be needed
            # due to OCR translation/spelling differences.
            
            # Try to find a match in system summary
            matched_sys_cat = None
            for sys_cat in system_summary.keys():
                # basic case-insensitive substring match to handle slight OCR variances
                if sys_cat.lower() in cat.lower() or cat.lower() in sys_cat.lower():
                    matched_sys_cat = sys_cat
                    break
            
            if matched_sys_cat:
                system_checked.add(matched_sys_cat)
                sys_amount = system_summary[matched_sys_cat]
                diff = amount - sys_amount
                
                if abs(diff) > 0.01: # allow slight float variation
                    discrepancies.append({
                        'category': cat,
                        'image_amount': amount,
                        'system_amount': sys_amount,
                        'difference': diff
                    })
                else:
                    matched.append({
                        'category': cat,
                        'amount': amount
                    })
            else:
                missing_in_system.append({
                    'category': cat,
                    'amount': amount
                })
                
    # Check for items in system that weren't in the image
    missing_in_image = []
    for sys_cat, sys_amount in system_summary.items():
        if sys_cat not in system_checked:
            missing_in_image.append({
                'category': sys_cat,
                'system_amount': sys_amount
            })
            
    return {
        'missing_in_system': missing_in_system,
        'missing_in_image': missing_in_image,
        'discrepancies': discrepancies,
        'matched': matched
    }

def calculate_promotion_diff(image_promotions, system_promotions_total):
    """
    Calculates differences in promotions.
    """
    img_promo_total = float(image_promotions.get('total_promotions_lak', 0)) if image_promotions else 0.0
    sys_promo_total = float(system_promotions_total)
    
    diff = img_promo_total - sys_promo_total
    
    return {
        'image_total': img_promo_total,
        'system_total': sys_promo_total,
        'difference': diff,
        'needs_cross_day_check': diff > 0 # If image has more promotions than system, might be from cross-day
    }
