/**
 * API Client — barrel file
 *
 * Re-exports everything from the domain modules so that existing imports
 * from '@/lib/api' or '../lib/api' continue to work without changes.
 */

export * from './auth';
export * from './users';
export * from './reports';
export * from './rigs';
export * from './companies';
export * from './logistics';
export * from './incidents';
export * from './admin';
export * from './notifications';
export * from './preferences';
export * from './sync';
export * from './license';
export * from './cloudLogs';
