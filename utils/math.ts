
/**
 * Generates a random number with Gaussian distribution (Box-Muller transform)
 */
export const gaussianRandom = (mean: number, stdDev: number): number => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
};

/**
 * Constants for the Current Balance Experiment (Based on Image 11.1)
 */
export const PHYSICS_CONSTANTS = {
  N: 200,          // Number of turns
  L: 0.08,         // Length of bottom edge (m)
  PRECISION: 0.001 // Dynamometer precision (N)
};

/**
 * Calculate the magnetic force F = N*I*B*L (theta = 90 deg)
 */
export const calculateMagneticForce = (i: number, b: number): number => {
  return PHYSICS_CONSTANTS.N * i * b * PHYSICS_CONSTANTS.L;
};
