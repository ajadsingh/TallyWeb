# Tally Prime 6.0 Web Extension – Financial Dashboard Application

This project is an **extended web version of Tally Prime 6.0**, bringing powerful business management tools to your browser. It enables seamless access to Tally data and features from anywhere, leveraging Tally’s XML API for real-time financial insights, analytics, and business operations management.

Built with React.js and TypeScript, this dashboard integrates with your existing Tally server, providing modules for sales, purchases, inventory, ledgers, and more—all accessible via a modern web interface.

## Project Structure

```
src/
├── modules/                    # Feature-based modules
│   ├── dashboard/             # Main dashboard module
│   ├── sales/                 # Sales management module
│   ├── purchases/             # Purchase management module
│   └── inventory/             # Inventory management module
├── shared/                    # Shared components and utilities
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
├── context/                   # React context providers
└── docs/                      # Documentation
```

## Features

### Dashboard Module
- **Overview Cards**: Key financial metrics with trend indicators
- **Cash & Bank Overview**: Real-time balance tracking
- **Quick Stats**: Important alerts and notifications
- **Recent Activity**: Latest transactions across all modules

### Sales Module
- **Sales Overview**: Revenue metrics and top customers
- **Sales Analytics**: Interactive charts and performance metrics
- **Customer Management**: Complete customer database with contact information
- **Sales Transactions**: Detailed transaction history with filtering

### Purchases Module
- **Purchase Overview**: Procurement metrics and top suppliers
- **Purchase Analytics**: Spending analysis and supplier performance
- **Supplier Management**: Supplier database with ratings and contact details
- **Purchase Transactions**: Complete purchase order history

### Inventory Module
- **Inventory Overview**: Stock value and category breakdown
- **Stock Levels**: Visual representation of current stock levels
- **Low Stock Alerts**: Critical and low stock notifications with reorder suggestions
- **Inventory Movements**: Complete stock movement history

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Access to a running Tally Prime 6.0 server (with Tally XML API enabled)

### Installation
```bash
npm install
```

### Tally Server Configuration (IMPORTANT)
To connect the dashboard to your Tally server, you **must configure the Tally server URL in `vite.config.ts`** before running the app. This enables the reverse proxy for API requests.

#### How to Set the Tally Server URL
1. Open `vite.config.ts` in the project root.
2. Locate the `server.proxy` section:
   ```js
   server: {
     proxy: {
       '/api/tally': {
         target: 'http://<YOUR_TALLY_SERVER_IP>:<PORT>',
         changeOrigin: true,
         rewrite: (path) => path.replace(/^\/api\/tally/, ''),
         timeout: 120000,
         proxyTimeout: 120000,
       }
     }
   }
   ```
3. Replace `http://192.168.31.119:9000` with your actual Tally server’s IP and port.
   - Example: `target: 'http://192.168.1.100:9000'`
4. Save the file.

> **Note:** The app will not work unless the Tally server URL is correctly set and the Tally server is running with XML API enabled.

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Architecture & Integration

### Modular Design
Each module is self-contained with its own components, logic, and routing. This makes the application:
- **Scalable**: Easy to add new modules
- **Maintainable**: Clear separation of concerns
- **Testable**: Isolated functionality

### Component Structure
- **Page Components**: Main module entry points
- **Feature Components**: Specific functionality within modules
- **Shared Components**: Reusable UI elements

### State Management
- **Context API**: Global state management
- **Local State**: Component-specific state
- **Custom Hooks**: Reusable state logic

### Tally Integration
- **Reverse Proxy**: All requests to `/api/tally` are proxied to your Tally server using the configuration in `vite.config.ts`.
- **XML API**: The app communicates with Tally using its XML API for fetching and managing business data.
- **Security**: Ensure your Tally server is accessible only to trusted clients and the API is properly secured.

## Customization & Extensibility

### Adding New Modules
1. Create a new folder in `src/modules/`
2. Add module components and routing
3. Update the main App.tsx navigation
4. Add documentation in `docs/modules/`

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-first approach
- **Color System**: Consistent color palette
- **Component Variants**: Reusable style patterns

### Data Integration
- **Live Tally Data**: Connects directly to your Tally server for real business data
- **API Ready**: Easily extend to other APIs or data sources
- **Tally XML API**: Designed for robust Tally integration

## Documentation

- [Dashboard Module](./modules/dashboard.md)
- [Sales Module](./modules/sales.md)
- [Purchases Module](./modules/purchases.md)
- [Inventory Module](./modules/inventory.md)
- [Shared Components](./shared/components.md)
- [API Integration](./api-integration.md)
- [Customization Guide](./customization.md)
- [Tally Integration](https://help.tallysolutions.com/tally-prime/xml-interface/)

## Contributing

1. Follow the modular architecture
2. Use TypeScript for type safety
3. Write comprehensive documentation
4. Test components thoroughly
5. Follow naming conventions
6. Ensure Tally server configuration is documented for new contributors

## License

This project is licensed under the MIT License.