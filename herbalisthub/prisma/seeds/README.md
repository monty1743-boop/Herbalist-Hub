# Database Seeding Guide

This directory contains comprehensive seeding scripts for the HerbalistHub database. The seeds create realistic sample data for development and testing environments.

## Overview

The seeding system is designed to:
- Create realistic sample data for all major entities
- Maintain referential integrity between related records
- Demonstrate HIPAA-compliant data handling
- Support both development and testing environments
- Provide meaningful data for UI/UX development

## Seeding Structure

### Main Seed File
- `seed.ts` - Main orchestrator that runs all seeding functions in correct order

### Individual Seed Modules
- `users.ts` - Users, roles, authentication data, and user settings
- `herbs.ts` - Herb inventory with detailed information and inventory logs
- `formulas.ts` - Herbal formulas, ingredients, and preparation methods
- `appointments.ts` - Appointments, consultations, and intake forms
- `content.ts` - Blog posts, educational resources, and categories
- `audit-logs.ts` - HIPAA compliance audit logs and system events

## Sample Data Created

### Users & Authentication
- **1 Admin**: admin@herbalisthub.com (password: admin123!)
- **2 Herbalists**: With practice information and certifications
- **3 Clients**: With detailed health profiles and preferences
- **1 Public User**: For website access
- **User Settings**: Communication, privacy, and display preferences

### Herb Inventory
- **10 Herbs**: Covering major categories (adaptogens, digestive, nervine, immune)
- **Detailed Information**: Latin names, suppliers, storage, certifications
- **Inventory Tracking**: Stock levels, costs, minimum thresholds
- **Activity Logs**: Additions, removals, and adjustments

### Formulas & Preparations
- **5 Formulas**: Professional herbal blends with full documentation
- **Ingredients**: Proper ratios and cost calculations
- **Instructions**: Detailed preparation methods
- **Business Data**: Pricing, markup, and profitability

### Appointments & Consultations
- **7 Appointments**: Past, current, and future appointments
- **4 Consultation Notes**: Detailed HIPAA-compliant notes
- **2 Intake Forms**: Comprehensive health intake data
- **Realistic Scenarios**: Stress, diabetes, women's health

### Educational Content
- **3 Blog Posts**: Long-form educational content
- **4 Resource Categories**: Organized educational materials
- **2 Educational Resources**: Monographs and guides
- **SEO Optimized**: Meta titles, descriptions, and keywords

### Audit Logs
- **15+ Audit Entries**: Comprehensive HIPAA compliance tracking
- **Event Types**: Logins, PHI access, admin actions, system events
- **Security Events**: Failed logins, suspicious activity
- **System Logs**: Backups, configuration changes

## Usage

### Run All Seeds
```bash
npm run db:seed
```

### Reset Database (Development Only)
```bash
npm run db:reset
```

### Individual Seeding (for development)
```bash
# Run specific seed file
npx tsx prisma/seeds/users.ts
```

## Environment Considerations

### Development Environment
- Full data clearing and reseeding supported
- Includes debug information and verbose logging
- All sample passwords are simple for testing

### Production Environment
- Seeding is **disabled** in production
- Only essential system data would be created
- Strong passwords and security measures required

## Security Notes

### Sample Passwords
All sample users use simple passwords for development:
- Admin: `admin123!`
- Herbalists: `herbalist123!`
- Clients: `client123!`
- Public: `public123!`

**⚠️ Never use these passwords in production!**

### PHI Data
All health information is:
- Automatically encrypted using the PHI encryption system
- Properly audited with HIPAA-compliant logging
- Created with realistic but fictional data
- Follows proper consent and authorization patterns

### HIPAA Compliance
The seeded data demonstrates:
- Proper audit logging for all PHI access
- User role-based access controls
- Data encryption for sensitive fields
- Consent tracking and management
- Business associate agreements (simulated)

## Customization

### Adding New Seed Data
1. Create new function in appropriate seed file
2. Export function from seed module
3. Add to main seed orchestration in `seed.ts`
4. Maintain referential integrity

### Modifying Existing Data
- Edit the data arrays in individual seed files
- Ensure foreign key relationships remain valid
- Update any dependent calculations (costs, totals, etc.)

### Environment-Specific Data
```typescript
if (process.env.NODE_ENV === 'development') {
  // Development-only seeding
}
```

## Troubleshooting

### Common Issues

**Foreign Key Constraints**
- Ensure parent records exist before creating child records
- Check the seeding order in main `seed.ts` file

**Unique Constraint Violations**
- Clear existing data before reseeding
- Check for duplicate emails or other unique fields

**Missing Dependencies**
- Verify all required users exist before creating related records
- Check that herbs exist before creating formula ingredients

### Error Recovery
If seeding fails partway through:
1. Check the error message for specific constraints
2. Use `npm run db:reset` to start fresh
3. Fix the data issue in the appropriate seed file
4. Rerun `npm run db:seed`

## Data Relationships

```
Users
├── PracticeInfo (Herbalists)
├── ClientProfile (Clients)
├── UserSettings (All authenticated users)
└── Appointments (as client or herbalist)

Herbs
├── InventoryLogs
├── FormulaIngredients
└── Preparations

Formulas
├── FormulaIngredients → Herbs
├── Preparations
└── BlogPosts (references)

Appointments
├── ConsultationNotes
├── Client → Users
└── Herbalist → Users

Content
├── BlogPosts → Users (authors)
├── ResourceCategories
└── EducationalResources

AuditLogs
└── Users (tracked activity)
```

## Best Practices

1. **Run seeds in a clean environment** - Use `db:reset` for full refresh
2. **Test data thoroughly** - Verify relationships and constraints
3. **Keep seeds updated** - Maintain as schema evolves
4. **Document changes** - Update this README when modifying seeds
5. **Environment awareness** - Different data for dev/test/staging

## Support

For issues with seeding:
1. Check the console output for specific errors
2. Verify database connection and schema
3. Ensure all required environment variables are set
4. Review the individual seed files for data integrity

The seeding system is designed to be robust and comprehensive, providing a solid foundation for development and testing of the HerbalistHub platform.