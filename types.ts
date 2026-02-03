
export interface Measurement {
  id: string;
  // Giá trị thực từ mô phỏng (dùng để đối soát ẩn)
  trueCurrent: number;
  trueF1: number;
  trueF2: number;
  trueF: number;
  
  // Giá trị do học sinh tự quan sát và điền vào
  inputI: string;
  inputF1: string;
  inputF2: string;
  inputF: string;
  inputB: string; // Giá trị B tính toán cho riêng lần đo này
  
  // Trạng thái kiểm tra của dòng này
  isValidated?: boolean;
  isCorrect?: boolean;
}

export interface SimulationState {
  targetB: number;
  fOffset: number;
  currentI: number;
  currentDirection: number; // 1: Thuận, -1: Nghịch
  isBalanced: boolean;
  isOverheated: boolean;
  tiltAngle: number;
}
