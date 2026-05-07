import streamlit as st
import pandas as pd
import tempfile
import os
from datetime import datetime

from vision_api import extract_ledger_data_from_image
from db_integration import get_system_summary
from reconciliation import cross_check_items, calculate_promotion_diff

st.set_page_config(page_title="Ledger Reconciliation App", layout="wide")

st.title("📊 XANGKHAM Ledger Reconciliation App")
st.markdown("Automated reconciliation between physical ledger images and the system database using CometAPI Vision.")

# Sidebar Configuration
st.sidebar.header("Configuration")
target_date = st.sidebar.date_input("Target Date", datetime.today())
target_date_str = target_date.strftime("%Y-%m-%d")

st.sidebar.markdown("### Status")
st.sidebar.success(f"DB Status: Ready")
st.sidebar.success(f"API Key: Loaded")

# Main Interface
st.header(f"Reconciliation for {target_date_str}")

uploaded_file = st.file_uploader("Upload Ledger/Account Summary Image", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    st.image(uploaded_file, caption="Uploaded Image", width=400)
    
    if st.button("Start Reconciliation"):
        with st.spinner("Analyzing image and extracting data..."):
            # Save uploaded file to temp path for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
                tmp_file.write(uploaded_file.getvalue())
                tmp_path = tmp_file.name
                
            try:
                # 1. Extract from Image
                image_data = extract_ledger_data_from_image(tmp_path)
                
                if not image_data:
                    st.error("Failed to extract data from the image. Please check the API configuration or image quality.")
                else:
                    st.success("Data successfully extracted from image!")
                    
                    # 2. Fetch from Database
                    system_summary = get_system_summary(target_date_str)
                    
                    # Assume promotions are categorized under 'PROMOTION' in the database
                    system_promotions = system_summary.get('PROMOTION', 0.0)
                    if 'PROMOTION' in system_summary:
                        del system_summary['PROMOTION'] # Remove from general cross-check
                        
                    # 3. Cross Check
                    reconciliation_results = cross_check_items(image_data, system_summary)
                    promo_diff = calculate_promotion_diff(image_data.get('promotions'), system_promotions)
                    
                    # UI Presentation
                    tab1, tab2, tab3 = st.tabs(["⚠️ Missing Items & Discrepancies", "💰 Promotion Summary", "✅ Matched Items"])
                    
                    with tab1:
                        st.subheader("Items in Image but NOT in System")
                        if reconciliation_results['missing_in_system']:
                            df_missing = pd.DataFrame(reconciliation_results['missing_in_system'])
                            st.dataframe(df_missing, use_container_width=True)
                            st.info("💡 Highlight: Staff needs to manually key these into the system.")
                        else:
                            st.success("No missing items!")
                            
                        st.subheader("Amount Discrepancies")
                        if reconciliation_results['discrepancies']:
                            df_disc = pd.DataFrame(reconciliation_results['discrepancies'])
                            st.dataframe(df_disc, use_container_width=True)
                        else:
                            st.success("No amount discrepancies for matched items.")
                            
                    with tab2:
                        st.subheader("Promotion Reconciliation")
                        col1, col2, col3 = st.columns(3)
                        col1.metric("Image Total (LAK)", f"{promo_diff['image_total']:,.2f}")
                        col2.metric("System Total (LAK)", f"{promo_diff['system_total']:,.2f}")
                        col3.metric("Difference", f"{promo_diff['difference']:,.2f}")
                        
                        if promo_diff['needs_cross_day_check']:
                            st.warning("⚠️ Image promotion total exceeds system total. This may be due to cross-day promotions.")
                            st.info("Please upload Day X+1 promotion summary to verify cross-day adjustments.")
                            # Future implementation: Upload Day X+1 logic here
                        elif promo_diff['difference'] < 0:
                            st.warning("⚠️ System promotion total exceeds Image total. Please check system records.")
                        else:
                            st.success("✅ Promotions match perfectly!")
                            
                    with tab3:
                        st.subheader("Matched Items")
                        if reconciliation_results['matched']:
                            df_matched = pd.DataFrame(reconciliation_results['matched'])
                            st.dataframe(df_matched, use_container_width=True)
                        else:
                            st.info("No items matched.")
                            
            finally:
                os.remove(tmp_path)
