// These lines are TypeScript interfaces that describe the shape of the objects that will be passing around in the code so that everything lines up with your GraphQL schema. These are "blueprints" for project data.

export interface Stock {
  ticker: string;
  price: number;
  change: number;
  logo: string;        
  name: string;  
  changePercent: number;
  summaries: Summary[]; 
}

export interface Summary {
    id: string;
    timestamp: string;
    text: string;
    headlines: string[];
    image?: string;              // Article image URL
    source?: string;             // News source
    url?: string;                // Link to full article
    sourceLogoUrl?: string;      // Source logo URL
}

export interface Settings {
    thresholds: Threshold[];
    channels: string[];
}

export interface Threshold {
    ticker: string;
    percent: number;
}

export interface SettingsInput {
    thresholds: ThresholdInput[];
    channels: string[];
}

export interface ThresholdInput {
    ticker: string;
    percent: number;
}