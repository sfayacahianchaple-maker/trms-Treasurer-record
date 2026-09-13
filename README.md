# Treasurer Record Management System

## Description
A web-based system for managing members, zones, zone treasurers, monthly membership payments, additional fees, payment history, and official receipts.

## Technology
- React
- JavaScript
- Vite
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase RLS

## User Roles

### Head Treasurer
Full system management.

### Zone Treasurer
Manages payments for the assigned zone.

## Main Features
- Authentication
- Zone management
- Member management
- Treasurer management
- Monthly dues
- Additional fees
- Payment tracking
- Automatic Active/Inactive status
- Payment history
- Yearly reports
- Official receipts

## Installation
npm install

npm run dev

## Environment Variables
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

Do not include actual credentials in the README.

## Production Build
npm run build

## GitHub Setup
```bash
git init
git add .
git commit -m "Initial TRMS system"
git branch -M main
git remote add origin https://github.com/yourusername/trms.git
```

> Do not push environment variables or service-role credentials.
