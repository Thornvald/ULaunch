use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub screenshot_path: Option<String>,
    pub sln_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub struct EngineInfo {
    pub version: String,
    pub path: String,
}
