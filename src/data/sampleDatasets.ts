import type { AnalysisConfig, Dataset } from '../types/stats';

export interface SampleBundle {
  dataset: Dataset;
  defaultAnalysis: AnalysisConfig;
}

export function createClinicalDataset(): SampleBundle {
  return {
    dataset: {
      id: 'clinical_bp',
      name: 'Clinical Trial: Blood Pressure & Dosage',
      nameId: 'Uji Klinis: Tekanan Darah & Dosis',
      sourceType: 'sample',
      undoStack: [],
      columns: [
        { key: 'Patient_ID', label: 'Patient_ID', scale: 'nominal' },
        { key: 'Treatment', label: 'Treatment', scale: 'nominal' },
        { key: 'Dose_Group', label: 'Dose_Group', scale: 'nominal' },
        { key: 'Age', label: 'Age', scale: 'continuous' },
        { key: 'Baseline_BP', label: 'Baseline_BP', scale: 'continuous' },
        { key: 'Post_BP', label: 'Post_BP', scale: 'continuous' },
        { key: 'Dosage_mg', label: 'Dosage_mg', scale: 'continuous' },
        { key: 'Adherence', label: 'Adherence', scale: 'continuous' },
        { key: 'Outcome', label: 'Outcome', scale: 'nominal' },
      ],
      rows: [
        { Patient_ID: 'P01', Treatment: 'Placebo', Dose_Group: 'Control', Age: 48, Baseline_BP: 146, Post_BP: 144, Dosage_mg: 0, Adherence: 88, Outcome: 'Stable' },
        { Patient_ID: 'P02', Treatment: 'Placebo', Dose_Group: 'Control', Age: 52, Baseline_BP: 151, Post_BP: 149, Dosage_mg: 0, Adherence: 84, Outcome: 'Stable' },
        { Patient_ID: 'P03', Treatment: 'Placebo', Dose_Group: 'Control', Age: 44, Baseline_BP: 142, Post_BP: 143, Dosage_mg: 0, Adherence: 91, Outcome: 'Stable' },
        { Patient_ID: 'P04', Treatment: 'Placebo', Dose_Group: 'Control', Age: 59, Baseline_BP: 155, Post_BP: 152, Dosage_mg: 0, Adherence: 79, Outcome: 'Stable' },
        { Patient_ID: 'P05', Treatment: 'Placebo', Dose_Group: 'Control', Age: 50, Baseline_BP: 148, Post_BP: 145, Dosage_mg: 0, Adherence: 90, Outcome: 'Improved' },
        { Patient_ID: 'P06', Treatment: 'Placebo', Dose_Group: 'Control', Age: 46, Baseline_BP: 139, Post_BP: 140, Dosage_mg: 0, Adherence: 86, Outcome: 'Stable' },
        { Patient_ID: 'P07', Treatment: 'Placebo', Dose_Group: 'Control', Age: 61, Baseline_BP: 158, Post_BP: 156, Dosage_mg: 0, Adherence: 82, Outcome: 'Stable' },
        { Patient_ID: 'P08', Treatment: 'Placebo', Dose_Group: 'Control', Age: 55, Baseline_BP: 149, Post_BP: 148, Dosage_mg: 0, Adherence: 85, Outcome: 'Stable' },
        { Patient_ID: 'P09', Treatment: 'Placebo', Dose_Group: 'Control', Age: 42, Baseline_BP: 138, Post_BP: 136, Dosage_mg: 0, Adherence: 93, Outcome: 'Improved' },
        { Patient_ID: 'P10', Treatment: 'Placebo', Dose_Group: 'Control', Age: 57, Baseline_BP: 153, Post_BP: 151, Dosage_mg: 0, Adherence: 81, Outcome: 'Stable' },
        { Patient_ID: 'P11', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 49, Baseline_BP: 147, Post_BP: 135, Dosage_mg: 25, Adherence: 91, Outcome: 'Improved' },
        { Patient_ID: 'P12', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 54, Baseline_BP: 152, Post_BP: 138, Dosage_mg: 25, Adherence: 89, Outcome: 'Improved' },
        { Patient_ID: 'P13', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 43, Baseline_BP: 141, Post_BP: 132, Dosage_mg: 25, Adherence: 94, Outcome: 'Improved' },
        { Patient_ID: 'P14', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 60, Baseline_BP: 156, Post_BP: 145, Dosage_mg: 30, Adherence: 83, Outcome: 'Stable' },
        { Patient_ID: 'P15', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 47, Baseline_BP: 144, Post_BP: 134, Dosage_mg: 25, Adherence: 92, Outcome: 'Improved' },
        { Patient_ID: 'P16', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 53, Baseline_BP: 150, Post_BP: 139, Dosage_mg: 30, Adherence: 87, Outcome: 'Improved' },
        { Patient_ID: 'P17', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 45, Baseline_BP: 143, Post_BP: 133, Dosage_mg: 25, Adherence: 95, Outcome: 'Improved' },
        { Patient_ID: 'P18', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 58, Baseline_BP: 154, Post_BP: 144, Dosage_mg: 30, Adherence: 80, Outcome: 'Stable' },
        { Patient_ID: 'P19', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 51, Baseline_BP: 149, Post_BP: 137, Dosage_mg: 30, Adherence: 90, Outcome: 'Improved' },
        { Patient_ID: 'P20', Treatment: 'Active', Dose_Group: 'Low_Dose', Age: 41, Baseline_BP: 140, Post_BP: 131, Dosage_mg: 25, Adherence: 96, Outcome: 'Improved' },
        { Patient_ID: 'P21', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 50, Baseline_BP: 148, Post_BP: 124, Dosage_mg: 60, Adherence: 94, Outcome: 'Improved' },
        { Patient_ID: 'P22', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 56, Baseline_BP: 154, Post_BP: 129, Dosage_mg: 60, Adherence: 91, Outcome: 'Improved' },
        { Patient_ID: 'P23', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 44, Baseline_BP: 143, Post_BP: 121, Dosage_mg: 55, Adherence: 96, Outcome: 'Improved' },
        { Patient_ID: 'P24', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 62, Baseline_BP: 159, Post_BP: 133, Dosage_mg: 65, Adherence: 88, Outcome: 'Improved' },
        { Patient_ID: 'P25', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 48, Baseline_BP: 146, Post_BP: 123, Dosage_mg: 60, Adherence: 95, Outcome: 'Improved' },
        { Patient_ID: 'P26', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 53, Baseline_BP: 151, Post_BP: 127, Dosage_mg: 60, Adherence: 92, Outcome: 'Improved' },
        { Patient_ID: 'P27', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 46, Baseline_BP: 144, Post_BP: 122, Dosage_mg: 55, Adherence: 97, Outcome: 'Improved' },
        { Patient_ID: 'P28', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 59, Baseline_BP: 157, Post_BP: 134, Dosage_mg: 65, Adherence: 86, Outcome: 'Stable' },
        { Patient_ID: 'P29', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 51, Baseline_BP: 149, Post_BP: 126, Dosage_mg: 60, Adherence: 93, Outcome: 'Improved' },
        { Patient_ID: 'P30', Treatment: 'Active', Dose_Group: 'High_Dose', Age: 43, Baseline_BP: 141, Post_BP: 119, Dosage_mg: 55, Adherence: 98, Outcome: 'Improved' },
      ],
    },
    defaultAnalysis: {
      activeTest: 'anova',
      dependentVars: ['Post_BP'],
      groupingVar: 'Dose_Group',
      pairedVarA: 'Baseline_BP',
      pairedVarB: 'Post_BP',
      independentVars: ['Dosage_mg', 'Baseline_BP', 'Adherence'],
      categoricalVarA: 'Treatment',
      categoricalVarB: 'Outcome',
      corMethod: 'pearson',
      alpha: 0.05,
      showJitter: true,
      showRegCI: true,
    },
  };
}

export function createEducationDataset(): SampleBundle {
  return {
    dataset: {
      id: 'pedagogical_exam',
      name: 'Pedagogy Study: Method & Exam Scores',
      nameId: 'Studi Pedagogi: Metode & Skor Ujian',
      sourceType: 'sample',
      undoStack: [],
      columns: [
        { key: 'Student_ID', label: 'Student_ID', scale: 'nominal' },
        { key: 'Method', label: 'Method', scale: 'nominal' },
        { key: 'Track', label: 'Track', scale: 'nominal' },
        { key: 'Study_Hours', label: 'Study_Hours', scale: 'continuous' },
        { key: 'Pre_Test', label: 'Pre_Test', scale: 'continuous' },
        { key: 'Post_Test', label: 'Post_Test', scale: 'continuous' },
        { key: 'Motivation', label: 'Motivation', scale: 'ordinal' },
        { key: 'Passed', label: 'Passed', scale: 'nominal' },
      ],
      rows: [
        { Student_ID: 'S01', Method: 'Self_Study', Track: 'Online', Study_Hours: 4.5, Pre_Test: 62, Post_Test: 68, Motivation: 3, Passed: 'No' },
        { Student_ID: 'S02', Method: 'Self_Study', Track: 'Online', Study_Hours: 5.2, Pre_Test: 65, Post_Test: 71, Motivation: 3, Passed: 'Yes' },
        { Student_ID: 'S03', Method: 'Self_Study', Track: 'Online', Study_Hours: 3.8, Pre_Test: 58, Post_Test: 63, Motivation: 2, Passed: 'No' },
        { Student_ID: 'S04', Method: 'Self_Study', Track: 'Campus', Study_Hours: 6.1, Pre_Test: 67, Post_Test: 74, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S05', Method: 'Self_Study', Track: 'Online', Study_Hours: 4.9, Pre_Test: 60, Post_Test: 66, Motivation: 3, Passed: 'No' },
        { Student_ID: 'S06', Method: 'Self_Study', Track: 'Campus', Study_Hours: 5.7, Pre_Test: 64, Post_Test: 72, Motivation: 3, Passed: 'Yes' },
        { Student_ID: 'S07', Method: 'Self_Study', Track: 'Online', Study_Hours: 4.1, Pre_Test: 59, Post_Test: 65, Motivation: 2, Passed: 'No' },
        { Student_ID: 'S08', Method: 'Self_Study', Track: 'Campus', Study_Hours: 6.4, Pre_Test: 68, Post_Test: 76, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S09', Method: 'Interactive', Track: 'Campus', Study_Hours: 7.2, Pre_Test: 63, Post_Test: 83, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S10', Method: 'Interactive', Track: 'Campus', Study_Hours: 8.1, Pre_Test: 66, Post_Test: 87, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S11', Method: 'Interactive', Track: 'Online', Study_Hours: 6.8, Pre_Test: 61, Post_Test: 79, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S12', Method: 'Interactive', Track: 'Campus', Study_Hours: 7.5, Pre_Test: 64, Post_Test: 85, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S13', Method: 'Interactive', Track: 'Online', Study_Hours: 5.9, Pre_Test: 60, Post_Test: 76, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S14', Method: 'Interactive', Track: 'Campus', Study_Hours: 8.4, Pre_Test: 69, Post_Test: 90, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S15', Method: 'Interactive', Track: 'Campus', Study_Hours: 7.0, Pre_Test: 62, Post_Test: 81, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S16', Method: 'Interactive', Track: 'Online', Study_Hours: 6.3, Pre_Test: 59, Post_Test: 77, Motivation: 3, Passed: 'Yes' },
        { Student_ID: 'S17', Method: 'Hybrid_Lab', Track: 'Campus', Study_Hours: 8.6, Pre_Test: 64, Post_Test: 91, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S18', Method: 'Hybrid_Lab', Track: 'Campus', Study_Hours: 9.1, Pre_Test: 67, Post_Test: 94, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S19', Method: 'Hybrid_Lab', Track: 'Online', Study_Hours: 7.9, Pre_Test: 61, Post_Test: 86, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S20', Method: 'Hybrid_Lab', Track: 'Campus', Study_Hours: 8.2, Pre_Test: 65, Post_Test: 89, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S21', Method: 'Hybrid_Lab', Track: 'Online', Study_Hours: 7.4, Pre_Test: 62, Post_Test: 84, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S22', Method: 'Hybrid_Lab', Track: 'Campus', Study_Hours: 9.4, Pre_Test: 70, Post_Test: 95, Motivation: 5, Passed: 'Yes' },
        { Student_ID: 'S23', Method: 'Hybrid_Lab', Track: 'Campus', Study_Hours: 8.0, Pre_Test: 63, Post_Test: 88, Motivation: 4, Passed: 'Yes' },
        { Student_ID: 'S24', Method: 'Hybrid_Lab', Track: 'Online', Study_Hours: 7.6, Pre_Test: 60, Post_Test: 85, Motivation: 4, Passed: 'Yes' },
      ],
    },
    defaultAnalysis: {
      activeTest: 'regression',
      dependentVars: ['Post_Test'],
      groupingVar: 'Method',
      pairedVarA: 'Pre_Test',
      pairedVarB: 'Post_Test',
      independentVars: ['Study_Hours', 'Pre_Test'],
      categoricalVarA: 'Method',
      categoricalVarB: 'Passed',
      corMethod: 'pearson',
      alpha: 0.05,
      showJitter: true,
      showRegCI: true,
    },
  };
}

export function createConsumerDataset(): SampleBundle {
  return {
    dataset: {
      id: 'consumer_loyalty',
      name: 'Consumer Survey: Satisfaction & Loyalty',
      nameId: 'Survei Konsumen: Kepuasan & Loyalitas',
      sourceType: 'sample',
      undoStack: [],
      columns: [
        { key: 'Resp_ID', label: 'Resp_ID', scale: 'nominal' },
        { key: 'Segment', label: 'Segment', scale: 'nominal' },
        { key: 'Price_Score', label: 'Price_Score', scale: 'continuous' },
        { key: 'Service_Score', label: 'Service_Score', scale: 'continuous' },
        { key: 'Trust_Index', label: 'Trust_Index', scale: 'continuous' },
        { key: 'NPS_Score', label: 'NPS_Score', scale: 'continuous' },
        { key: 'Plan_Tier', label: 'Plan_Tier', scale: 'nominal' },
      ],
      rows: [
        { Resp_ID: 'R01', Segment: 'Enterprise', Price_Score: 72, Service_Score: 88, Trust_Index: 84, NPS_Score: 86, Plan_Tier: 'Pro' },
        { Resp_ID: 'R02', Segment: 'Enterprise', Price_Score: 68, Service_Score: 91, Trust_Index: 89, NPS_Score: 90, Plan_Tier: 'Pro' },
        { Resp_ID: 'R03', Segment: 'Enterprise', Price_Score: 75, Service_Score: 85, Trust_Index: 82, NPS_Score: 83, Plan_Tier: 'Pro' },
        { Resp_ID: 'R04', Segment: 'Enterprise', Price_Score: 70, Service_Score: 84, Trust_Index: 80, NPS_Score: 81, Plan_Tier: 'Pro' },
        { Resp_ID: 'R05', Segment: 'Enterprise', Price_Score: 78, Service_Score: 93, Trust_Index: 91, NPS_Score: 92, Plan_Tier: 'Pro' },
        { Resp_ID: 'R06', Segment: 'Enterprise', Price_Score: 66, Service_Score: 79, Trust_Index: 76, NPS_Score: 77, Plan_Tier: 'Basic' },
        { Resp_ID: 'R07', Segment: 'Enterprise', Price_Score: 74, Service_Score: 90, Trust_Index: 87, NPS_Score: 88, Plan_Tier: 'Pro' },
        { Resp_ID: 'R08', Segment: 'Enterprise', Price_Score: 71, Service_Score: 86, Trust_Index: 83, NPS_Score: 85, Plan_Tier: 'Pro' },
        { Resp_ID: 'R09', Segment: 'SMB', Price_Score: 82, Service_Score: 76, Trust_Index: 75, NPS_Score: 78, Plan_Tier: 'Basic' },
        { Resp_ID: 'R10', Segment: 'SMB', Price_Score: 85, Service_Score: 80, Trust_Index: 79, NPS_Score: 82, Plan_Tier: 'Pro' },
        { Resp_ID: 'R11', Segment: 'SMB', Price_Score: 79, Service_Score: 71, Trust_Index: 70, NPS_Score: 72, Plan_Tier: 'Basic' },
        { Resp_ID: 'R12', Segment: 'SMB', Price_Score: 88, Service_Score: 83, Trust_Index: 82, NPS_Score: 84, Plan_Tier: 'Pro' },
        { Resp_ID: 'R13', Segment: 'SMB', Price_Score: 77, Service_Score: 68, Trust_Index: 67, NPS_Score: 69, Plan_Tier: 'Basic' },
        { Resp_ID: 'R14', Segment: 'SMB', Price_Score: 84, Service_Score: 78, Trust_Index: 77, NPS_Score: 80, Plan_Tier: 'Pro' },
        { Resp_ID: 'R15', Segment: 'SMB', Price_Score: 81, Service_Score: 74, Trust_Index: 73, NPS_Score: 75, Plan_Tier: 'Basic' },
        { Resp_ID: 'R16', Segment: 'SMB', Price_Score: 86, Service_Score: 82, Trust_Index: 81, NPS_Score: 83, Plan_Tier: 'Pro' },
        { Resp_ID: 'R17', Segment: 'SMB', Price_Score: 74, Service_Score: 66, Trust_Index: 65, NPS_Score: 67, Plan_Tier: 'Basic' },
        { Resp_ID: 'R18', Segment: 'SMB', Price_Score: 83, Service_Score: 77, Trust_Index: 76, NPS_Score: 79, Plan_Tier: 'Basic' },
        { Resp_ID: 'R19', Segment: 'SMB', Price_Score: 89, Service_Score: 85, Trust_Index: 84, NPS_Score: 87, Plan_Tier: 'Pro' },
        { Resp_ID: 'R20', Segment: 'SMB', Price_Score: 80, Service_Score: 72, Trust_Index: 71, NPS_Score: 73, Plan_Tier: 'Basic' },
      ],
    },
    defaultAnalysis: {
      activeTest: 'correlation',
      dependentVars: ['Price_Score', 'Service_Score', 'Trust_Index', 'NPS_Score'],
      groupingVar: 'Segment',
      pairedVarA: 'Service_Score',
      pairedVarB: 'Trust_Index',
      independentVars: ['Service_Score', 'Price_Score'],
      categoricalVarA: 'Segment',
      categoricalVarB: 'Plan_Tier',
      corMethod: 'pearson',
      alpha: 0.05,
      showJitter: true,
      showRegCI: true,
    },
  };
}

export const SAMPLE_DATASET_FACTORIES: Array<{
  id: string;
  nameEn: string;
  nameId: string;
  meta: string;
  create: () => SampleBundle;
}> = [
  {
    id: 'clinical_bp',
    nameEn: 'Clinical Trial: Blood Pressure & Dosage',
    nameId: 'Uji Klinis: Tekanan Darah & Dosis',
    meta: '30 obs · 9 vars',
    create: createClinicalDataset,
  },
  {
    id: 'pedagogical_exam',
    nameEn: 'Pedagogy Study: Method & Exam Scores',
    nameId: 'Studi Pedagogi: Metode & Skor Ujian',
    meta: '24 obs · 8 vars',
    create: createEducationDataset,
  },
  {
    id: 'consumer_loyalty',
    nameEn: 'Consumer Survey: Satisfaction & Loyalty',
    nameId: 'Survei Konsumen: Kepuasan & Loyalitas',
    meta: '20 obs · 7 vars',
    create: createConsumerDataset,
  },
];
