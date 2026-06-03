// src/components/Signup.js
import React, { useState } from "react";
import "../../css/signup.css";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// Firebase imports
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, signOut, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  /* ----------------- STEP 1: Basic Info ----------------- */
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [extName, setExtName] = useState("");
  const [gender, setGender] = useState("");
  const [bdate, setBdate] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState("");

  // Avatar selection
  /* const avatars = [
    "/assets/img/solvia_avatar1.png",
    "/assets/img/solvia_avatar2.png",
    "/assets/img/solvia_avatar3.png",
    "/assets/img/solvia_avatar4.png",
    "/assets/img/solvia_avatar5.png",
    "/assets/img/solvia_avatar6.png",
    "/assets/img/solvia_avatar7.png",
    "/assets/img/solvia_avatar8.png",
    "/assets/img/solvia_avatar9.png",
    "/assets/img/solvia_avatar10.png",
    "/assets/img/solvia_avatar11.png",
    "/assets/img/solvia_avatar12.png",
  ]; */
  const avatars = [
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar1.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar2.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar3.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar4.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar5.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar6.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar7.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar8.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar9.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar10.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar11.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar12.png`,
  ];
  const [avatarIndex, setAvatarIndex] = useState(null);

  // Municipalities of Camarines Norte
  const municipalities = [
    "Basud",
    "Capalonga",
    "Daet",
    "Jose Panganiban",
    "Labo",
    "Mercedes",
    "Paracale",
    "San Lorenzo Ruiz",
    "San Vicente",
    "Sta. Elena",
    "Talisay",
    "Vinzons",
  ];
  const [municipality, setMunicipality] = useState("");

  /* ----------------- STEP 2: Account Info ----------------- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const accountStatus = "Pending";

  /* ----------------- VALIDATIONS ----------------- */
  const isStep1Valid =
    firstName &&
    lastName &&
    gender &&
    bdate &&
    contact &&
    role &&
    avatarIndex !== null &&
    (role === "PAO" || (role === "MAO" && municipality));

  const isStep2Valid = email && password && confirmPassword && password === confirmPassword;

  const trimValue = (value) => value?.trim();

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!isStep1Valid) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Fields",
        text: "Please fill all required fields before proceeding.",
      });
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = (e) => {
    e.preventDefault();
    setStep(step - 1);
  };

  /* ----------------- SUBMIT ----------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isStep2Valid) {
      Swal.fire({
        icon: "error",
        title: "Invalid Input",
        text: "Please make sure all fields are filled and passwords match.",
      });
      return;
    }

    let userCredential;

    try {
      // Check if email already exists
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (methods.length > 0) {
        Swal.fire({
          icon: "error",
          title: "Email Already Registered",
          text: "Please use a different email or login instead.",
        });
        return;
      }

      // Create user in Firebase Auth
      userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const userId = userCredential.user.uid;

      try {
        // Save user info in Firestore
        await setDoc(doc(db, "AccountInformation", userId), {
          firstName: trimValue(firstName),
          middleName: trimValue(middleName),
          lastName: trimValue(lastName),
          extName: trimValue(extName),
          gender: trimValue(gender),
          bdate: trimValue(bdate),
          contact: trimValue(contact),
          email: trimValue(email),
          accountStatus: accountStatus,
          role: trimValue(role),
          avatarIndex: avatarIndex,
          municipality: trimValue(municipality),
          createdAt: new Date().toISOString(),
        });

        // Sign out after signup
        await signOut(auth);

        // Move to Step 3 (pending verification notice)
        setStep(3);

        await Swal.fire({
          icon: "success",
          title: "Account Created!",
          text: "Your account has been submitted successfully. Please wait for admin verification.",
        });
      } catch (firestoreError) {
        // Delete Auth user if Firestore save fails
        await userCredential.user.delete();
        throw firestoreError;
      }
    } catch (error) {
      console.error("Signup error:", error.message);
      Swal.fire({
        icon: "error",
        title: "Signup Failed",
        text: error.message,
      });
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-box">

        <div className="signup_container">
          {/* <img src="/assets/img/solvia_logo5.png" alt="SOLVIA Logo" className="signup-logo" /> */}
          <img
            src={`${import.meta.env.BASE_URL}assets/img/solvia_logo5.png`}
            alt="SOLVIA Logo"
            className="signup-logo"
          />
          <h1 className="signup-title">SOLVIA</h1>  
          <p className="signup-subtitle">Create your account</p>

          <form onSubmit={handleSubmit}>
            {/* ----------------- STEP 1 ----------------- */}
            {step === 1 && (
              <>
                <h2 className="step-title">Step 1: Basic Info</h2>

                {/* Avatar */}
                <div className="form-group">
                  <label>Select Avatar</label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center", // CENTER the images
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    {avatars.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Avatar ${idx + 1}`}
                        onClick={() => setAvatarIndex(idx)}
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          border: avatarIndex === idx ? "3px solid #007BFF" : "2px solid #ccc",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      />
                    ))}
                  </div>
                </div>


                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Middle Name</label>
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Extension Name</label>
                  <input type="text" value={extName} onChange={(e) => setExtName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Birthdate</label>
                  <input type="date" value={bdate} onChange={(e) => setBdate(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Contact Number</label>
                  <input type="number" value={contact} onChange={(e) => setContact(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="">Select Role</option>
                    <option value="PAO">Provincial Agricultural Office (PAO)</option>
                    <option value="MAO">Municipal Agricultural Office (MAO)</option>
                  </select>
                </div>

                {/* Municipality */}
                {/* Municipality - only if MAO */}
                {role === "MAO" && (
                  <div className="form-group">
                    <label>Select Municipality</label>
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      required={role === "MAO"} // required only for MAO
                    >
                      <option value="">Select Municipality</option>
                      {municipalities.map((m, idx) => (
                        <option key={idx} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}


                <div className="form-controls">
                  <button onClick={handleNextStep} className="signup-btn" disabled={!isStep1Valid}>
                    Next
                  </button>
                </div>
              </>
            )}

            {/* ----------------- STEP 2 ----------------- */}
            {step === 2 && (
              <>
                <h2 className="step-title">Step 2: Account Info</h2>

                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>

                <div className="form-controls">
                  <button onClick={handlePrevStep} className="signup-btn prev-btn">Previous</button>
                  <button type="submit" className="signup-btn" disabled={!isStep2Valid}>Submit</button>
                </div>
              </>
            )}

            {/* ----------------- STEP 3: Pending Verification ----------------- */}
            {step === 3 && (
              <div className="notice-step">
                <h2 className="step-title">Account Pending Verification</h2>
                <p>
                  Your account has been submitted successfully. Please wait for
                  an admin to verify and approve your account.
                </p>
                <button
                  className="signup-btn"
                  type="button"
                  onClick={() => navigate("/")}
                >
                  Back to Login
                </button>
              </div>
            )}
          </form>

          <p className="signup-footer">
            Already have an account? <Link to="/">Login here</Link>
          </p>

          <p className="signup-footer">© {new Date().getFullYear()} SOLVIA</p>
        </div>

      </div>
    </div>
  );
}
